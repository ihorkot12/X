import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentAccount,
  joinRemoteTeam,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "../../src/lib/authClient";

const account = {
  id: "acct-1",
  name: "Ірина",
  email: "iryna@example.test",
  role: "methodology_editor",
  createdAt: "2026-08-03T10:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("registers with a cookie session and returns only validated account metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ account }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await registerAccount({
      name: "Ірина",
      email: "IRYNA@example.test",
      password: "long-password",
      role: "coach",
    });

    expect(result).toEqual(account);
    expect(result).not.toHaveProperty("password");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ірина",
        email: "iryna@example.test",
        password: "long-password",
        role: "coach",
      }),
    });
  });

  it("logs in and restores the current cookie session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ account }))
      .mockResolvedValueOnce(jsonResponse({ account }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginAccount({ email: account.email, password: "long-password" })).resolves.toEqual(account);
    await expect(getCurrentAccount()).resolves.toEqual(account);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("logs out the server session with cookies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await logoutAccount();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  });

  it("joins a team through the authenticated endpoint", async () => {
    const payload = {
      membership: {
        id: "member-1",
        teamId: "team-1",
        coachId: "coach-1",
        athleteAccountId: "acct-1",
        athleteName: "Ірина",
        joinedAt: "2026-08-03T10:05:00.000Z",
      },
      team: {
        id: "team-1",
        ownerId: "coach-1",
        name: "Збірна",
        createdAt: "2026-08-01T10:00:00.000Z",
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      joinRemoteTeam({ joinCode: " ABC123 ", athleteName: "Ірина", athleteProfileId: "profile-1" }),
    ).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/team-join", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: "ABC123", athleteName: "Ірина", athleteProfileId: "profile-1" }),
    });
  });

  it("translates a known backend error to Ukrainian", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ code: "invalid_credentials", error: "Email or password is incorrect." }, 401)),
    );

    await expect(loginAccount({ email: account.email, password: "wrong-password" })).rejects.toThrow(
      "Неправильна електронна пошта або пароль.",
    );
  });
});
