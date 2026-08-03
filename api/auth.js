import { randomUUID } from "node:crypto";
import {
  assignedRegistrationRole,
  clearSessionCookie,
  createPasswordHash,
  createSession,
  deleteCurrentSession,
  getAuthenticatedAccount,
  mapAccount,
  setSessionCookie,
  verifyPassword,
} from "./_auth.js";
import { ensureDatabaseSchema, getSql } from "./_db.js";
import {
  assertAllowedKeys,
  errorResponse,
  HttpError,
  json,
  readJsonBody,
  requireJsonContentType,
} from "./_http.js";

const AUTH_BODY_LIMIT = 16_384;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const attempts = new Map();

function getRequestAction(req, body = {}) {
  const url = new URL(req.url || "/api/auth", "http://localhost");
  const pathAction = url.pathname.split("/").filter(Boolean)[2];
  return String(pathAction || url.searchParams.get("action") || body.action || "").toLowerCase();
}

function getClientAddress(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0];
  return String(firstForwarded || req.socket?.remoteAddress || "unknown").trim().slice(0, 120);
}

function enforceAttemptLimit(key, limit, windowMs) {
  const now = Date.now();
  if (attempts.size > 5_000) {
    for (const [attemptKey, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(attemptKey);
    }
    if (attempts.size > 5_000) attempts.delete(attempts.keys().next().value);
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw new HttpError(429, "Too many authentication attempts. Try again later.", "rate_limited");
  }
  attempts.set(key, { ...current, count: current.count + 1 });
}

function validateEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "Enter a valid email address.", "invalid_email");
  }
  return email;
}

function validatePassword(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "Password is required.", "invalid_password");
  }
  const byteLength = Buffer.byteLength(value, "utf8");
  if (value.length < 10 || value.length > 128 || byteLength > 256) {
    throw new HttpError(400, "Password must be between 10 and 128 characters.", "invalid_password");
  }
  return value;
}

function validateName(value) {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new HttpError(400, "Name must be between 2 and 80 characters.", "invalid_name");
  }
  return name;
}

async function register(sql, req, res, body) {
  assertAllowedKeys(body, ["action", "name", "email", "password", "role"]);
  const name = validateName(body.name);
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);
  const requestedRole = String(body.role || "athlete").toLowerCase();
  const role = assignedRegistrationRole(email, requestedRole);
  if (!role) {
    throw new HttpError(400, "Public registration supports athlete or coach accounts only.", "invalid_role");
  }

  enforceAttemptLimit(`register:${getClientAddress(req)}`, 5, 60 * 60 * 1000);
  const passwordHash = await createPasswordHash(password);
  const accountId = `acct_${randomUUID()}`;
  let rows;
  try {
    rows = await sql`
      INSERT INTO bbp_accounts (id, name, email, role, password_hash, created_at)
      VALUES (${accountId}, ${name}, ${email}, ${role}, ${passwordHash}, NOW())
      RETURNING *
    `;
  } catch (error) {
    if (error?.code === "23505") {
      throw new HttpError(409, "An account with this email already exists.", "account_exists");
    }
    throw error;
  }

  const session = await createSession(sql, accountId);
  setSessionCookie(res, session.token);
  return json(res, 201, { account: mapAccount(rows[0]) });
}

async function login(sql, req, res, body) {
  assertAllowedKeys(body, ["action", "email", "password"]);
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);
  enforceAttemptLimit(`login:${getClientAddress(req)}:${email}`, 10, 15 * 60 * 1000);

  const rows = await sql`SELECT * FROM bbp_accounts WHERE LOWER(email) = ${email} LIMIT 1`;
  const account = rows[0];
  const passwordMatches = await verifyPassword(password, account?.password_hash);
  if (!account || !account.password_hash || !passwordMatches) {
    throw new HttpError(401, "Email or password is incorrect.", "invalid_credentials");
  }

  const session = await createSession(sql, account.id);
  setSessionCookie(res, session.token);
  return json(res, 200, { account: mapAccount(account) });
}

async function me(sql, req, res) {
  const account = await getAuthenticatedAccount(sql, req);
  return json(res, 200, { account: mapAccount(account) });
}

async function logout(sql, req, res) {
  await deleteCurrentSession(sql, req);
  clearSessionCookie(res);
  return json(res, 200, { ok: true });
}

export default async function handler(req, res) {
  try {
    let body = {};
    let action = getRequestAction(req);
    const method = String(req.method || "GET").toUpperCase();

    if (method === "POST") {
      if (action !== "logout" || req.headers?.["content-type"]) {
        requireJsonContentType(req);
        body = await readJsonBody(req, { maxBytes: AUTH_BODY_LIMIT });
        action = getRequestAction(req, body);
      }
    }

    if (method === "GET" && (!action || action === "me")) action = "me";
    if (method === "DELETE" && (!action || action === "logout")) action = "logout";

    const allowed =
      (method === "GET" && action === "me") ||
      (method === "POST" && ["register", "login", "logout"].includes(action)) ||
      (method === "DELETE" && action === "logout");
    if (!allowed) {
      res.setHeader("Allow", "GET, POST, DELETE");
      throw new HttpError(405, "Auth operation is not supported.", "method_not_allowed");
    }

    const sql = getSql();
    await ensureDatabaseSchema(sql);
    if (action === "register") return await register(sql, req, res, body);
    if (action === "login") return await login(sql, req, res, body);
    if (action === "logout") return await logout(sql, req, res);
    return await me(sql, req, res);
  } catch (error) {
    return errorResponse(res, error, "Authentication service failed.");
  }
}
