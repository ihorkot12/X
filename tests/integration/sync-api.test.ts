import { createHash } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockRequest, createMockResponse } from "../helpers/http";

const neonFactory = vi.hoisted(() => vi.fn());

vi.mock("@neondatabase/serverless", () => ({
  neon: neonFactory,
}));

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDemoMode = process.env.DEMO_MODE;

type SqlOptions = {
  existingAccounts?: Array<Record<string, unknown>>;
  existingTestHistory?: Array<Record<string, unknown>>;
  sessionAccount?: Record<string, unknown> | null;
  memberships?: Array<Record<string, unknown>>;
  joinedTeams?: Array<Record<string, unknown>>;
};

function createSqlMock({
  existingAccounts = [],
  existingTestHistory = [],
  sessionAccount = null,
  memberships = [],
  joinedTeams = [],
}: SqlOptions = {}) {
  const sql = vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join("?").replace(/\s+/g, " ").trim();
    if (query.includes("FROM bbp_sessions AS session")) return sessionAccount ? [sessionAccount] : [];
    if (query.startsWith("SELECT * FROM bbp_accounts WHERE id")) return existingAccounts;
    if (query.startsWith("SELECT id, owner_id FROM bbp_test_history")) return existingTestHistory;
    if (query.startsWith("SELECT payload FROM bbp_team_memberships")) return memberships;
    if (query.startsWith("SELECT id, owner_id, payload, created_at FROM bbp_teams")) return joinedTeams;
    if (query.startsWith("INSERT INTO bbp_accounts")) {
      return [{
        id: "account-1",
        name: "Test Coach",
        email: "coach@example.test",
        role: "coach",
        created_at: "2026-01-01T00:00:00.000Z",
      }];
    }
    if (query.startsWith("INSERT INTO bbp_test_history") && existingTestHistory.length) return [];
    if (/^INSERT INTO bbp_(athletes|programs|training_logs|teams|team_memberships|test_history)/.test(query)) {
      return [{ id: "written-record" }];
    }
    return [];
  });
  return Object.assign(sql, {
    transaction: vi.fn(async (queriesOrFn: unknown) => {
      const queries = typeof queriesOrFn === "function" ? queriesOrFn(sql) : queriesOrFn;
      return Promise.all(queries as Promise<unknown>[]);
    }),
  });
}

function createSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    account: {
      id: "account-1",
      name: "Test Coach",
      email: "coach@example.test",
      role: "coach",
      createdAt: "2026-01-01T00:00:00.000Z",
      syncToken: "matching-token",
    },
    athletes: [],
    programs: [],
    logs: [],
    teams: [],
    memberships: [],
    testHistory: [],
    ...overrides,
  };
}

async function loadHandler(sql = createSqlMock(), { demoMode = true } = {}) {
  process.env.DATABASE_URL = "postgresql://test.invalid/local";
  if (demoMode) process.env.DEMO_MODE = "true";
  else delete process.env.DEMO_MODE;
  neonFactory.mockReturnValue(sql);
  vi.resetModules();
  return (await import("../../api/sync.js")).default;
}

beforeEach(() => {
  neonFactory.mockReset();
  delete process.env.DATABASE_URL;
  delete process.env.DEMO_MODE;
});

afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemoMode;
});

describe("/api/sync authentication and ownership boundaries", () => {
  it("fails closed without a configured database", async () => {
    vi.resetModules();
    const handler = (await import("../../api/sync.js")).default;
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(response.statusCode).toBe(503);
    expect(response.body.error).toContain("not configured");
    expect(neonFactory).not.toHaveBeenCalled();
  });

  it.each(["GET", "POST"])("requires both sync headers for %s", async (method) => {
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(createMockRequest({ method, body: createSnapshot() }), response);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "sync credentials are required" });
  });

  it("rejects a snapshot for a different account", async () => {
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(createMockRequest({
      headers: {
        "x-bbp-account-id": "account-2",
        "x-bbp-sync-token": "matching-token",
      },
      body: createSnapshot(),
    }), response);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toContain("does not match the sync credentials");
  });

  it("rejects an invalid token for an existing account", async () => {
    const sql = createSqlMock({
      existingAccounts: [{
        id: "account-1",
        email: "coach@example.test",
        sync_token_hash: createHash("sha256").update("expected-token").digest("hex"),
      }],
    });
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(createMockRequest({
      headers: {
        "x-bbp-account-id": "account-1",
        "x-bbp-sync-token": "wrong-token",
      },
      body: createSnapshot(),
    }), response);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "invalid sync credentials" });
  });

  it("rejects header-only legacy sync in production before creating a passwordless account", async () => {
    const sql = createSqlMock();
    const handler = await loadHandler(sql, { demoMode: false });
    const response = createMockResponse();

    await handler(createMockRequest({
      headers: {
        "x-bbp-account-id": "account-1",
        "x-bbp-sync-token": "matching-token",
      },
      body: createSnapshot(),
    }), response);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Authentication is required." });
    expect(sql.transaction).not.toHaveBeenCalled();
    expect(sql.mock.calls.some(([strings]) => strings.join(" ").includes("INSERT INTO bbp_accounts"))).toBe(false);
  });

  it("returns safe joined-team summaries to an authenticated athlete", async () => {
    const membership = {
      id: "membership-1",
      teamId: "team-1",
      coachId: "coach-1",
      athleteAccountId: "account-1",
      athleteName: "Test Athlete",
      athleteEmail: "athlete@example.test",
      joinedAt: "2026-01-03T00:00:00.000Z",
    };
    const sql = createSqlMock({
      sessionAccount: {
        id: "account-1",
        name: "Test Athlete",
        email: "athlete@example.test",
        role: "athlete",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      memberships: [{ payload: membership }],
      joinedTeams: [{
        id: "team-1",
        owner_id: "coach-1",
        created_at: "2026-01-02T00:00:00.000Z",
        payload: {
          id: "team-1",
          ownerId: "coach-1",
          name: "Competition Team",
          joinCode: "BB-1234",
          createdAt: "2026-01-02T00:00:00.000Z",
          privateNote: "not for athletes",
        },
      }],
    });
    const handler = await loadHandler(sql, { demoMode: false });
    const response = createMockResponse();

    await handler(createMockRequest({
      method: "GET",
      headers: { cookie: `bbp_session=${"s".repeat(43)}` },
    }), response);

    expect(response.statusCode).toBe(200);
    expect(response.body.teams).toEqual([{
      id: "team-1",
      ownerId: "coach-1",
      name: "Competition Team",
      createdAt: "2026-01-02T00:00:00.000Z",
    }]);
    expect(response.body.memberships).toEqual([membership]);
    expect(JSON.stringify(response.body.teams)).not.toContain("BB-1234");
    expect(JSON.stringify(response.body.teams)).not.toContain("privateNote");
  });

  it("rejects records owned by another account", async () => {
    const handler = await loadHandler();
    const response = createMockResponse();
    const snapshot = createSnapshot({
      athletes: [{
        id: "athlete-1",
        ownerId: "account-2",
        savedAt: "2026-01-01T00:00:00.000Z",
        combatProfile: "hybrid",
        athleteProfile: {},
      }],
    });

    await handler(createMockRequest({
      headers: {
        "x-bbp-account-id": "account-1",
        "x-bbp-sync-token": "matching-token",
      },
      body: snapshot,
    }), response);

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: "athlete owner mismatch" });
  });

  it.each([
    {
      name: "an invalid later membership",
      override: {
        memberships: [{
          id: "membership-1",
          teamId: "missing-team",
          coachId: "account-1",
          athleteAccountId: "athlete-account-1",
          joinedAt: "2026-01-01T00:00:00.000Z",
        }],
      },
      expectedError: "Membership team does not belong to the specified coach.",
    },
    {
      name: "a later database ownership conflict",
      override: {
        testHistory: [{
          id: "test-1",
          athleteId: "athlete-1",
          athleteName: "Test Athlete",
          date: "2026-01-01",
          createdAt: "2026-01-01T00:00:00.000Z",
        }],
      },
      existingTestHistory: [{ id: "test-1", owner_id: "account-2" }],
      expectedError: "Test history belongs to another account.",
    },
  ])("does not send earlier snapshot writes when rejected for $name", async ({ override, existingTestHistory, expectedError }) => {
    const sql = createSqlMock({
      existingAccounts: [{
        id: "account-1",
        name: "Test Coach",
        email: "coach@example.test",
        role: "coach",
        created_at: "2026-01-01T00:00:00.000Z",
        sync_token_hash: createHash("sha256").update("matching-token").digest("hex"),
      }],
      existingTestHistory,
    });
    const handler = await loadHandler(sql);
    const response = createMockResponse();
    const snapshot = createSnapshot({
      athletes: [{
        id: "athlete-1",
        savedAt: "2026-01-01T00:00:00.000Z",
        combatProfile: "hybrid",
        athleteProfile: {},
      }],
      programs: [{
        id: "program-1",
        athleteId: "athlete-1",
        athleteName: "Test Athlete",
        savedAt: "2026-01-01T00:00:00.000Z",
        combatProfile: "hybrid",
        combatLoad: {},
        athleteProfile: {},
        programSettings: {},
        assessment: {},
        program: {},
      }],
      logs: [{
        id: "log-1",
        athleteId: "athlete-1",
        athleteName: "Test Athlete",
        date: "2026-01-01",
        week: 1,
        day: "Monday",
        status: "planned",
        readiness: 8,
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
      ...override,
    });

    await handler(createMockRequest({
      headers: {
        "x-bbp-account-id": "account-1",
        "x-bbp-sync-token": "matching-token",
      },
      body: snapshot,
    }), response);

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: expectedError });
    expect(sql.transaction).not.toHaveBeenCalled();
    expect(sql.mock.calls.some(([strings]) => /INSERT INTO bbp_(athletes|programs|training_logs)/.test(strings.join(" ")))).toBe(false);
  });

  it("accepts a minimal authenticated snapshot without external I/O", async () => {
    const sql = createSqlMock();
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(createMockRequest({
      headers: {
        "x-bbp-account-id": "account-1",
        "x-bbp-sync-token": "matching-token",
      },
      body: createSnapshot(),
    }), response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(sql).toHaveBeenCalled();
    expect(sql.transaction).toHaveBeenCalledOnce();
  });
});
