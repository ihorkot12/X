import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_PROMPT_LENGTH = 2500;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const buckets = new Map();

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function getClientId(req, body) {
  const accountId = req.headers["x-bbp-account-id"] || body.accountId;
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local";
  return String(Array.isArray(accountId) ? accountId[0] : accountId || ip).slice(0, 120);
}

function enforceRateLimit(clientId) {
  const now = Date.now();
  const current = buckets.get(clientId) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > current.resetAt) {
    buckets.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  if (current.count >= RATE_LIMIT) {
    const error = new Error("Too many AI requests. Wait a minute and try again.");
    error.statusCode = 429;
    throw error;
  }
  current.count += 1;
  buckets.set(clientId, current);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
    if (!process.env.GEMINI_API_KEY) return json(res, 503, { error: "GEMINI_API_KEY is not configured on the server." });

    const body = await readBody(req);
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return json(res, 400, { error: "Prompt is required." });
    if (prompt.length > MAX_PROMPT_LENGTH) return json(res, 413, { error: `Prompt is too long. Limit is ${MAX_PROMPT_LENGTH} characters.` });
    if (!req.headers["x-bbp-account-id"] && !body.accountId) return json(res, 401, { error: "Account id is required for AI requests." });

    enforceRateLimit(getClientId(req, body));

    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.35,
        maxOutputTokens: 700,
        systemInstruction:
          "You are a concise strength and conditioning assistant for combat-sport coaches. Do not invent medical diagnoses. Keep advice practical, conservative, and compatible with structured program sheets.",
      },
    });

    return json(res, 200, { text: response.text || "", model: MODEL });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || "Gemini request failed." });
  }
}
