import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { appendHeader, getCookie, HttpError } from "./_http.js";

export const SESSION_COOKIE_NAME = "bbp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const ACCOUNT_ROLES = new Set(["athlete", "coach", "methodology_editor", "admin"]);
export const PUBLIC_REGISTRATION_ROLES = new Set(["athlete", "coach"]);

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const scrypt = promisify(scryptCallback);
const DUMMY_PASSWORD_HASH = `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(SCRYPT_KEY_LENGTH).toString("base64url")}`;

export function hashOpaqueToken(token) {
  return createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

export function opaqueTokenMatchesHash(token, expectedHash) {
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(hashOpaqueToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return timingSafeEqual(actual, expected);
}

export async function createPasswordHash(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString("base64url")}$${Buffer.from(derivedKey).toString("base64url")}`;
}

export async function verifyPassword(password, encodedHash) {
  const parts = String(encodedHash || DUMMY_PASSWORD_HASH).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nValue, rValue, pValue, saltValue, hashValue] = parts;
  const options = {
    N: Number(nValue),
    r: Number(rValue),
    p: Number(pValue),
    maxmem: SCRYPT_OPTIONS.maxmem,
  };
  if (options.N !== SCRYPT_OPTIONS.N || options.r !== SCRYPT_OPTIONS.r || options.p !== SCRYPT_OPTIONS.p) return false;

  let expected;
  let salt;
  try {
    expected = Buffer.from(hashValue, "base64url");
    salt = Buffer.from(saltValue, "base64url");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEY_LENGTH || salt.length !== 16) return false;
  const actual = Buffer.from(await scrypt(password, salt, expected.length, options));
  return timingSafeEqual(actual, expected);
}

function parseAllowlist(name) {
  return new Set(
    String(process.env[name] || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function assignedRegistrationRole(email, requestedRole) {
  if (!PUBLIC_REGISTRATION_ROLES.has(requestedRole)) return null;
  const normalizedEmail = String(email).toLowerCase();
  if (parseAllowlist("ADMIN_EMAILS").has(normalizedEmail)) return "admin";
  if (parseAllowlist("METHODOLOGY_EDITOR_EMAILS").has(normalizedEmail)) return "methodology_editor";
  return requestedRole;
}

export function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: ACCOUNT_ROLES.has(row.role) ? row.role : "athlete",
    createdAt: row.created_at,
  };
}

export async function createSession(sql, accountId) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await sql`
    INSERT INTO bbp_sessions (token_hash, account_id, expires_at)
    VALUES (${tokenHash}, ${accountId}, ${expiresAt.toISOString()})
  `;
  await sql`DELETE FROM bbp_sessions WHERE expires_at <= NOW()`;
  return { token, tokenHash, expiresAt };
}

export function setSessionCookie(res, token) {
  const value = encodeURIComponent(token);
  appendHeader(
    res,
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
  );
}

export function clearSessionCookie(res) {
  appendHeader(
    res,
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`,
  );
}

export function getSessionToken(req) {
  const token = getCookie(req, SESSION_COOKIE_NAME);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export async function getAuthenticatedAccount(sql, req, { required = true } = {}) {
  const token = getSessionToken(req);
  if (!token) {
    if (!required) return null;
    throw new HttpError(401, "Authentication is required.", "authentication_required");
  }

  const rows = await sql`
    SELECT account.*
    FROM bbp_sessions AS session
    JOIN bbp_accounts AS account ON account.id = session.account_id
    WHERE session.token_hash = ${hashOpaqueToken(token)}
      AND session.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows[0]) {
    if (!required) return null;
    throw new HttpError(401, "Session is invalid or expired.", "invalid_session");
  }
  return rows[0];
}

export async function deleteCurrentSession(sql, req) {
  const token = getSessionToken(req);
  if (!token) return;
  await sql`DELETE FROM bbp_sessions WHERE token_hash = ${hashOpaqueToken(token)}`;
}

export function requireRole(account, allowedRoles) {
  if (!allowedRoles.includes(account.role)) {
    throw new HttpError(403, "This account does not have permission for that action.", "forbidden");
  }
}
