import { GoogleGenAI } from "@google/genai";
import { getAuthenticatedAccount } from "./_auth.js";
import { ensureDatabaseSchema, getSql } from "./_db.js";
import {
  assertAllowedKeys,
  errorResponse,
  HttpError,
  json,
  readJsonBody,
  requireJsonContentType,
} from "./_http.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_PROMPT_LENGTH = 2500;
const MAX_BODY_BYTES = 16_384;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const buckets = new Map();

function enforceRateLimit(clientId) {
  const now = Date.now();
  if (buckets.size > 5_000) {
    for (const [key, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(key);
    }
    if (buckets.size > 5_000) buckets.delete(buckets.keys().next().value);
  }
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

function requestedAccountId(req, body) {
  const header = req.headers?.["x-bbp-account-id"];
  return String((Array.isArray(header) ? header[0] : header) || body.accountId || "").trim();
}

async function resolveAccountContext(req, body) {
  if (process.env.DATABASE_URL) {
    const sql = getSql();
    await ensureDatabaseSchema(sql);
    const account = await getAuthenticatedAccount(sql, req, { required: false });
    if (account) {
      const requestedId = requestedAccountId(req, body);
      if (requestedId && requestedId !== account.id) {
        throw new HttpError(403, "AI request account does not match the authenticated account.", "forbidden");
      }
      return account;
    }
  }

  if (process.env.DEMO_MODE === "true") {
    const accountId = requestedAccountId(req, body);
    if (!accountId || accountId.length > 160) {
      throw new HttpError(401, "A demo account id is required for AI requests.", "authentication_required");
    }
    return { id: accountId, role: "athlete", isDemo: true };
  }

  if (!process.env.DATABASE_URL) getSql();
  throw new HttpError(401, "Authentication is required.", "authentication_required");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      throw new HttpError(405, "method not allowed", "method_not_allowed");
    }
    if (!process.env.GEMINI_API_KEY) {
      throw new HttpError(503, "AI service is not configured.", "ai_unavailable");
    }

    requireJsonContentType(req);
    const body = await readJsonBody(req, { maxBytes: MAX_BODY_BYTES });
    assertAllowedKeys(body, ["accountId", "prompt"]);
    const prompt = String(body.prompt || "").trim();
    if (!prompt) throw new HttpError(400, "Prompt is required.", "invalid_prompt");
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new HttpError(413, `Prompt is too long. Limit is ${MAX_PROMPT_LENGTH} characters.`, "prompt_too_long");
    }

    const account = await resolveAccountContext(req, body);
    enforceRateLimit(account.id);

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
    return errorResponse(res, error, "AI request failed.");
  }
}
