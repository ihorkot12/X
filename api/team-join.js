import { randomUUID } from "node:crypto";

import { getAuthenticatedAccount, requireRole } from "./_auth.js";
import { ensureDatabaseSchema, getSql } from "./_db.js";
import {
  assertAllowedKeys,
  errorResponse,
  HttpError,
  json,
  readJsonBody,
  requireJsonContentType,
} from "./_http.js";

const JOIN_BODY_LIMIT = 2_048;
const JOIN_ATTEMPT_LIMIT = 8;
const JOIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const JOIN_CODE_PATTERN = /^[A-Z0-9]{1,4}-[A-Z0-9]{4}$/;
const PROFILE_ID_PATTERN = /^[\p{L}\p{N}._:-]+$/u;
const attempts = new Map();

function getClientAddress(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0];
  return String(firstForwarded || req.socket?.remoteAddress || "unknown").trim().slice(0, 120);
}

function enforceAttemptLimit(req, accountId) {
  const now = Date.now();
  if (attempts.size > 5_000) {
    const activeAttempts = [...attempts].filter(([, value]) => value.resetAt > now);
    attempts.clear();
    activeAttempts.slice(-5_000).forEach(([key, value]) => attempts.set(key, value));
  }

  const key = `${accountId}:${getClientAddress(req)}`;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + JOIN_ATTEMPT_WINDOW_MS });
    return;
  }
  if (current.count >= JOIN_ATTEMPT_LIMIT) {
    throw new HttpError(429, "Too many team join attempts. Try again later.", "rate_limited");
  }
  attempts.set(key, { ...current, count: current.count + 1 });
}

function validateJoinRequest(value) {
  assertAllowedKeys(value, ["joinCode", "athleteName", "athleteProfileId"]);

  if (typeof value.joinCode !== "string") {
    throw new HttpError(400, "Team code is invalid.", "invalid_join_code");
  }
  const joinCode = value.joinCode.trim().toUpperCase();
  if (!JOIN_CODE_PATTERN.test(joinCode)) {
    throw new HttpError(400, "Team code is invalid.", "invalid_join_code");
  }

  if (typeof value.athleteName !== "string") {
    throw new HttpError(400, "Athlete name is invalid.", "invalid_athlete_name");
  }
  const athleteName = value.athleteName.trim();
  if (athleteName.length < 2 || athleteName.length > 80 || /[\u0000-\u001f\u007f]/.test(athleteName)) {
    throw new HttpError(400, "Athlete name is invalid.", "invalid_athlete_name");
  }

  let athleteProfileId;
  if (value.athleteProfileId !== undefined) {
    if (typeof value.athleteProfileId !== "string") {
      throw new HttpError(400, "Athlete profile id is invalid.", "invalid_athlete_profile_id");
    }
    athleteProfileId = value.athleteProfileId.trim();
    if (!athleteProfileId || athleteProfileId.length > 200 || !PROFILE_ID_PATTERN.test(athleteProfileId)) {
      throw new HttpError(400, "Athlete profile id is invalid.", "invalid_athlete_profile_id");
    }
  }

  return { joinCode, athleteName, athleteProfileId };
}

function safeTeamSummary(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: String(row.payload?.name || ""),
    createdAt: row.created_at ?? row.payload?.createdAt,
  };
}

function safeMembership(payload) {
  const membership = {
    id: payload.id,
    teamId: payload.teamId,
    coachId: payload.coachId,
    athleteAccountId: payload.athleteAccountId,
    athleteName: payload.athleteName,
    joinedAt: payload.joinedAt,
  };
  return payload.athleteProfileId
    ? { ...membership, athleteProfileId: payload.athleteProfileId }
    : membership;
}

async function findTeamByJoinCode(sql, joinCode) {
  const rows = await sql`
    SELECT id, owner_id, payload, created_at
    FROM bbp_teams
    WHERE UPPER(BTRIM(payload->>'joinCode')) = ${joinCode}
    LIMIT 2
  `;
  if (rows.length !== 1) {
    throw new HttpError(404, "Team code is invalid.", "team_not_found");
  }
  return rows[0];
}

async function findExistingMembership(sql, teamId, athleteAccountId) {
  return sql`
    SELECT id FROM bbp_team_memberships
    WHERE athlete_account_id = ${athleteAccountId}
      AND payload->>'teamId' = ${teamId}
    LIMIT 1
  `;
}

async function insertMembership(sql, team, account, input) {
  const membershipId = `member_${randomUUID()}`;
  const joinedAt = new Date().toISOString();
  const lockKey = `team-join:${team.id}:${account.id}`;
  const profileId = input.athleteProfileId ?? null;

  const [, insertedRows] = await sql.transaction((transactionSql) => [
    transactionSql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    transactionSql`
      INSERT INTO bbp_team_memberships (id, coach_id, athlete_account_id, payload, joined_at)
      SELECT
        ${membershipId},
        team.owner_id,
        ${account.id},
        jsonb_strip_nulls(jsonb_build_object(
          'id', ${membershipId},
          'teamId', team.id,
          'coachId', team.owner_id,
          'athleteAccountId', ${account.id},
          'athleteName', ${input.athleteName},
          'athleteEmail', ${account.email},
          'athleteProfileId', ${profileId},
          'joinedAt', ${joinedAt}
        )),
        ${joinedAt}
      FROM bbp_teams AS team
      WHERE team.id = ${team.id}
        AND team.owner_id <> ${account.id}
        AND NOT EXISTS (
          SELECT 1 FROM bbp_team_memberships AS existing
          WHERE existing.athlete_account_id = ${account.id}
            AND existing.payload->>'teamId' = team.id
        )
      RETURNING payload
    `,
  ]);

  return insertedRows[0]?.payload || null;
}

export default async function handler(req, res) {
  try {
    if (String(req.method || "GET").toUpperCase() !== "POST") {
      res.setHeader("Allow", "POST");
      throw new HttpError(405, "Method not allowed.", "method_not_allowed");
    }

    const sql = getSql();
    await ensureDatabaseSchema(sql);
    const account = await getAuthenticatedAccount(sql, req);
    requireRole(account, ["athlete", "admin"]);

    requireJsonContentType(req);
    const input = validateJoinRequest(await readJsonBody(req, { maxBytes: JOIN_BODY_LIMIT }));
    enforceAttemptLimit(req, account.id);

    const team = await findTeamByJoinCode(sql, input.joinCode);
    if (team.owner_id === account.id) {
      throw new HttpError(409, "You already own this team.", "team_owner_conflict");
    }

    const existingRows = await findExistingMembership(sql, team.id, account.id);
    if (existingRows[0]) {
      throw new HttpError(409, "You are already a member of this team.", "duplicate_membership");
    }

    const insertedPayload = await insertMembership(sql, team, account, input);
    if (!insertedPayload) {
      const concurrentMembership = await findExistingMembership(sql, team.id, account.id);
      if (concurrentMembership[0]) {
        throw new HttpError(409, "You are already a member of this team.", "duplicate_membership");
      }
      throw new HttpError(409, "Team membership could not be created.", "membership_conflict");
    }

    return json(res, 201, {
      membership: safeMembership(insertedPayload),
      team: safeTeamSummary(team),
    });
  } catch (error) {
    return errorResponse(res, error, "Team join failed.");
  }
}
