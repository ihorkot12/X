import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockRequest, createMockResponse } from "../helpers/http";

const generateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const originalApiKey = process.env.GEMINI_API_KEY;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDemoMode = process.env.DEMO_MODE;
const originalModel = process.env.GEMINI_MODEL;

async function loadHandler() {
  vi.resetModules();
  return (await import("../../api/gemini.js")).default;
}

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.DATABASE_URL;
  delete process.env.DEMO_MODE;
  delete process.env.GEMINI_MODEL;
  generateContent.mockReset();
  generateContent.mockResolvedValue({ text: "Conservative test guidance" });
});

afterAll(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemoMode;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

describe("POST /api/gemini", () => {
  it("rejects unsupported methods before reading a request body", async () => {
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(response.statusCode).toBe(405);
    expect(response.body).toEqual({ error: "method not allowed" });
  });

  it("fails closed when the server integration is not configured", async () => {
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(createMockRequest({ body: { prompt: "Help", accountId: "account-1" } }), response);

    expect(response.statusCode).toBe(503);
    expect(response.body.error).toContain("not configured");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it.each([
    [{ accountId: "account-1" }, 400, "Prompt is required."],
    [{ prompt: "x".repeat(2501), accountId: "account-1" }, 413, "Prompt is too long."],
    [{ prompt: "Build a conservative session" }, 401, "demo account id is required"],
  ])("validates request payload and authentication", async (body, status, message) => {
    process.env.GEMINI_API_KEY = "test-only-key";
    process.env.DEMO_MODE = "true";
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(createMockRequest({ body }), response);

    expect(response.statusCode).toBe(status);
    expect(response.body.error).toContain(message);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("uses the server model through a mocked provider for authenticated input", async () => {
    process.env.GEMINI_API_KEY = "test-only-key";
    process.env.DEMO_MODE = "true";
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(createMockRequest({
      headers: { "x-bbp-account-id": "account-1" },
      body: { prompt: "Build a conservative session" },
    }), response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      text: "Conservative test guidance",
      model: "gemini-2.5-flash",
    });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("rate-limits repeated requests by account", async () => {
    process.env.GEMINI_API_KEY = "test-only-key";
    process.env.DEMO_MODE = "true";
    const handler = await loadHandler();

    for (let requestNumber = 0; requestNumber < 10; requestNumber += 1) {
      const response = createMockResponse();
      await handler(createMockRequest({
        headers: { "x-bbp-account-id": "rate-test-account" },
        body: { prompt: `Request ${requestNumber}` },
      }), response);
      expect(response.statusCode).toBe(200);
    }

    const limitedResponse = createMockResponse();
    await handler(createMockRequest({
      headers: { "x-bbp-account-id": "rate-test-account" },
      body: { prompt: "One request too many" },
    }), limitedResponse);

    expect(limitedResponse.statusCode).toBe(429);
    expect(limitedResponse.body.error).toContain("Too many AI requests");
    expect(generateContent).toHaveBeenCalledTimes(10);
  });
});
