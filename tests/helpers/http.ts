type MockRequestOptions = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  remoteAddress?: string;
};

export function createMockRequest({
  method = "POST",
  headers = {},
  body,
  remoteAddress = "127.0.0.1",
}: MockRequestOptions = {}) {
  return {
    method,
    headers,
    body,
    socket: { remoteAddress },
  };
}

export function createMockResponse() {
  const headers = new Map<string, string>();
  let rawBody = "";

  return {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    end(body = "") {
      rawBody = String(body);
    },
    get headers() {
      return Object.fromEntries(headers);
    },
    get body() {
      return rawBody ? JSON.parse(rawBody) : undefined;
    },
  };
}
