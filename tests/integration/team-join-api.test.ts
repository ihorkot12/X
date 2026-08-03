import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockRequest, createMockResponse } from "../helpers/http";

const neonFactory = vi.hoisted(() => vi.fn());

vi.mock("@neondatabase/serverless", () => ({
  neon: neonFactory,
}));

const originalDatabaseUrl = process.env.DATABASE_URL;
const sessionToken = "s".repeat(43);

const athleteAccount = {
  id: "athlete-account-1",
  name: "Athlete Account",
  email: "athlete@example.test",
  role: "athlete",
  created_at: "2026-01-01T00:00:00.000Z",
};

const teamRow = {
  id: "team-1",
  owner_id: "coach-account-1",
  created_at: "2026-01-02T00:00:00.000Z",
  payload: {
    id: "team-1",
    ownerId: "coach-account-1",
    name: "Competition Team",
    joinCode: "BB-1234",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
};

type SqlOptions = {
  account?: Record<string, unknown> | null;
  teams?: Array<Record<string, unknown>>;
  existingMemberships?: Array<Record<string, unknown>>;
  insertedMembership?: Record<string, unknown> | null;
};

function createSqlMock({
  account = athleteAccount,
  teams = [teamRow],
  existingMemberships = [],
  insertedMembership,
}: SqlOptions = {}) {
  const sql = vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join("?").replace(/\s+/g, " ").trim();
    if (query.includes("FROM bbp_sessions AS session")) return account ? [account] : [];
    if (query.includes("UPPER(BTRIM(payload->>'joinCode'))")) return teams;
    if (query.startsWith("SELECT id FROM bbp_team_memberships")) return existingMemberships;
    if (query.startsWith("SELECT pg_advisory_xact_lock")) return [];
    if (query.startsWith("INSERT INTO bbp_team_memberships")) {
      if (insertedMembership === null) return [];
      return [{
        payload: insertedMembership ?? {
          id: "member-1",
          teamId: "team-1",
          coachId: "coach-account-1",
          athleteAccountId: "athlete-account-1",
          athleteName: "Test Athlete",
          athleteEmail: "athlete@example.test",
          athleteProfileId: "profile-1",
          joinedAt: "2026-08-03T12:00:00.000Z",
        },
      }];
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

async function loadHandler(sql = createSqlMock()) {
  process.env.DATABASE_URL = "postgresql://test.invalid/local";
  neonFactory.mockReturnValue(sql);
  vi.resetModules();
  return (await import("../../api/team-join.js")).default;
}

function authenticatedRequest(body: Record<string, unknown> = {}) {
  return createMockRequest({
    headers: { cookie: `bbp_session=${sessionToken}` },
    body: {
      joinCode: " bb-1234 ",
      athleteName: " Test Athlete ",
      athleteProfileId: " profile-1 ",
      ...body,
    },
  });
}

beforeEach(() => {
  neonFactory.mockReset();
  delete process.env.DATABASE_URL;
});

afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("POST /api/team-join", () => {
  it("requires an authenticated session cookie", async () => {
    const sql = createSqlMock({ account: null });
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(createMockRequest({ body: { joinCode: "BB-1234", athleteName: "Test Athlete" } }), response);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "Authentication is required." });
    expect(sql.transaction).not.toHaveBeenCalled();
  });

  it("rejects a validly shaped but incorrect code without exposing team details", async () => {
    const handler = await loadHandler(createSqlMock({ teams: [] }));
    const response = createMockResponse();

    await handler(authenticatedRequest({ joinCode: "BB-9999" }), response);

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Team code is invalid." });
  });

  it("rejects malformed input and unknown fields", async () => {
    const handler = await loadHandler();
    const response = createMockResponse();

    await handler(authenticatedRequest({ joinCode: "not a code", proof: "BB-1234" }), response);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain("Unexpected field");
  });

  it("rejects joining a team owned by the authenticated account", async () => {
    const ownedTeam = { ...teamRow, owner_id: athleteAccount.id };
    const sql = createSqlMock({ teams: [ownedTeam] });
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(authenticatedRequest(), response);

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({ error: "You already own this team." });
    expect(sql.transaction).not.toHaveBeenCalled();
  });

  it("rejects an existing membership for the same athlete and team", async () => {
    const sql = createSqlMock({ existingMemberships: [{ id: "member-existing" }] });
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(authenticatedRequest(), response);

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({ error: "You are already a member of this team." });
    expect(sql.transaction).not.toHaveBeenCalled();
  });

  it("allows athlete membership creation transactionally and returns sanitized records", async () => {
    const sql = createSqlMock();
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(authenticatedRequest(), response);

    expect(response.statusCode).toBe(201);
    expect(response.body.team).toEqual({
      id: "team-1",
      ownerId: "coach-account-1",
      name: "Competition Team",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    expect(response.body.membership).toMatchObject({
      teamId: "team-1",
      coachId: "coach-account-1",
      athleteAccountId: "athlete-account-1",
      athleteName: "Test Athlete",
      athleteProfileId: "profile-1",
    });
    expect(response.body.membership).not.toHaveProperty("athleteEmail");
    expect(JSON.stringify(response.body)).not.toContain("BB-1234");
    expect(sql.transaction).toHaveBeenCalledOnce();

    const insertCall = sql.mock.calls.find(([strings]) => strings.join(" ").includes("INSERT INTO bbp_team_memberships"));
    expect(insertCall).toBeDefined();
    expect(JSON.stringify(insertCall?.slice(1))).not.toContain("BB-1234");
  });

  it("rejects coach accounts from joining as athletes", async () => {
    const sql = createSqlMock({ account: { ...athleteAccount, role: "coach" } });
    const handler = await loadHandler(sql);
    const response = createMockResponse();

    await handler(authenticatedRequest(), response);

    expect(response.statusCode).toBe(403);
    expect(sql.transaction).not.toHaveBeenCalled();
  });

  it("rate limits repeated code attempts per account and client", async () => {
    const handler = await loadHandler(createSqlMock({ teams: [] }));

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = createMockResponse();
      await handler(authenticatedRequest({ joinCode: "BB-9999" }), response);
      expect(response.statusCode).toBe(404);
    }

    const limitedResponse = createMockResponse();
    await handler(authenticatedRequest({ joinCode: "BB-9999" }), limitedResponse);
    expect(limitedResponse.statusCode).toBe(429);
  });
});
