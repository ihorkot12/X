export class HttpError extends Error {
  constructor(statusCode, message, code = "request_error") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function parseJson(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.", "invalid_json");
  }
}

function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }
  return value;
}

export function requireJsonContentType(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !Array.isArray(req.body)) return;
  const contentType = String(req.headers?.["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.", "unsupported_media_type");
  }
}

export async function readJsonBody(req, { maxBytes = 16_384 } = {}) {
  const contentLength = Number(req.headers?.["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "Request body is too large.", "body_too_large");
  }

  if (req.body !== undefined && req.body !== null) {
    let body = req.body;
    if (Buffer.isBuffer(body)) body = parseJson(body.toString("utf8"));
    if (typeof body === "string") body = parseJson(body);
    const encoded = JSON.stringify(body);
    if (Buffer.byteLength(encoded, "utf8") > maxBytes) {
      throw new HttpError(413, "Request body is too large.", "body_too_large");
    }
    return assertPlainObject(body);
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new HttpError(413, "Request body is too large.", "body_too_large");
    }
    chunks.push(buffer);
  }

  return assertPlainObject(parseJson(Buffer.concat(chunks).toString("utf8")));
}

export function assertAllowedKeys(value, allowedKeys) {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw new HttpError(400, `Unexpected field: ${unknown[0]}.`, "invalid_schema");
  }
}

export function getCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of String(header).split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function appendHeader(res, name, value) {
  const current = typeof res.getHeader === "function" ? res.getHeader(name) : undefined;
  if (!current) {
    res.setHeader(name, value);
    return;
  }
  res.setHeader(name, Array.isArray(current) ? [...current, value] : [String(current), value]);
}

export function errorResponse(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500;
  const message = error instanceof HttpError ? error.message : statusCode >= 500 ? fallbackMessage : error?.message || fallbackMessage;
  return json(res, statusCode, {
    error: message,
  });
}
