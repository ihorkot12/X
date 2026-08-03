import {
  getAuthenticatedAccount,
  hashOpaqueToken,
  mapAccount,
  opaqueTokenMatchesHash,
  PUBLIC_REGISTRATION_ROLES,
  requireRole,
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

const SYNC_BODY_LIMIT = 1_048_576;
const COLLECTION_LIMITS = {
  athletes: 100,
  programs: 200,
  logs: 500,
  teams: 100,
  memberships: 500,
  testHistory: 500,
};

function forbidden(message) {
  return new HttpError(403, message, "forbidden");
}

function firstHeader(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function requireSyncHeaders(req) {
  const accountId = String(firstHeader(req, "x-bbp-account-id") || "");
  const syncToken = String(firstHeader(req, "x-bbp-sync-token") || "");
  if (!accountId || !syncToken) {
    throw new HttpError(401, "sync credentials are required", "authentication_required");
  }
  if (accountId.length > 160 || syncToken.length > 256) {
    throw new HttpError(401, "invalid sync credentials", "invalid_credentials");
  }
  return { accountId, syncToken };
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${label} must be an object.`, "invalid_schema");
  }
  return value;
}

function requireString(value, label, maxLength = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength || /[\u0000]/.test(value)) {
    throw new HttpError(400, `${label} is invalid.`, "invalid_schema");
  }
  return value;
}

function requireOptionalString(value, label, maxLength = 5_000) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > maxLength || /[\u0000]/.test(value)) {
    throw new HttpError(400, `${label} is invalid.`, "invalid_schema");
  }
  return value;
}

function requireDate(value, label) {
  const date = requireString(value, label, 50);
  if (!Number.isFinite(Date.parse(date))) {
    throw new HttpError(400, `${label} must be a valid date.`, "invalid_schema");
  }
  return date;
}

function validateCollection(snapshot, key) {
  const value = snapshot[key] ?? [];
  if (!Array.isArray(value) || value.length > COLLECTION_LIMITS[key]) {
    throw new HttpError(400, `${key} is invalid or exceeds its item limit.`, "invalid_schema");
  }
  value.forEach((item, index) => requireObject(item, `${key}[${index}]`));
  return value;
}

function validateSnapshot(value) {
  const snapshot = requireObject(value, "Snapshot");
  assertAllowedKeys(snapshot, ["account", "athletes", "programs", "logs", "teams", "memberships", "testHistory"]);
  const account = requireObject(snapshot.account, "Snapshot account");
  assertAllowedKeys(account, ["id", "name", "email", "role", "createdAt", "syncToken"]);
  requireString(account.id, "Account id", 160);
  requireString(account.name, "Account name", 80);
  const email = requireString(account.email, "Account email", 254).trim().toLowerCase();
  if (!email.includes("@")) throw new HttpError(400, "Account email is invalid.", "invalid_schema");
  requireDate(account.createdAt, "Account creation date");
  if (account.syncToken !== undefined) requireString(account.syncToken, "Sync token", 256);

  const athletes = validateCollection(snapshot, "athletes");
  const programs = validateCollection(snapshot, "programs");
  const logs = validateCollection(snapshot, "logs");
  const teams = validateCollection(snapshot, "teams");
  const memberships = validateCollection(snapshot, "memberships");
  const testHistory = validateCollection(snapshot, "testHistory");

  for (const athlete of athletes) {
    requireString(athlete.id, "Athlete id", 200);
    requireDate(athlete.savedAt, "Athlete saved date");
    requireString(athlete.combatProfile, "Combat profile", 50);
    requireObject(athlete.athleteProfile, "Athlete profile");
  }
  for (const program of programs) {
    requireString(program.id, "Program id", 200);
    requireString(program.athleteId, "Program athlete id", 200);
    requireString(program.athleteName, "Program athlete name", 160);
    requireDate(program.savedAt, "Program saved date");
    requireString(program.combatProfile, "Program combat profile", 50);
    ["combatLoad", "athleteProfile", "programSettings", "assessment", "program"].forEach((key) =>
      requireObject(program[key], `Program ${key}`),
    );
  }
  for (const log of logs) {
    requireString(log.id, "Log id", 200);
    requireString(log.athleteId, "Log athlete id", 200);
    requireString(log.athleteName, "Log athlete name", 160);
    requireDate(log.date, "Log date");
    requireDate(log.createdAt, "Log creation date");
    requireString(log.day, "Log day", 80);
    const status = requireString(log.status, "Log status", 30);
    if (!["planned", "done", "modified", "skipped"].includes(status)) {
      throw new HttpError(400, "Log status is invalid.", "invalid_schema");
    }
    if (!Number.isInteger(log.week) || log.week < 1 || log.week > 100) throw new HttpError(400, "Log week is invalid.", "invalid_schema");
    if (!Number.isInteger(log.readiness) || log.readiness < 0 || log.readiness > 10) throw new HttpError(400, "Log readiness is invalid.", "invalid_schema");
    if (log.sessionRpe !== undefined && log.sessionRpe !== null && (!Number.isInteger(log.sessionRpe) || log.sessionRpe < 0 || log.sessionRpe > 10)) {
      throw new HttpError(400, "Session RPE is invalid.", "invalid_schema");
    }
    if (log.bodyWeightKg !== undefined && log.bodyWeightKg !== null && log.bodyWeightKg !== "" && (typeof log.bodyWeightKg !== "number" || !Number.isFinite(log.bodyWeightKg) || log.bodyWeightKg <= 0 || log.bodyWeightKg > 500)) {
      throw new HttpError(400, "Body weight is invalid.", "invalid_schema");
    }
    requireOptionalString(log.notes, "Log notes");
    requireOptionalString(log.painNote, "Pain note");
  }
  for (const team of teams) {
    requireString(team.id, "Team id", 200);
    requireString(team.name, "Team name", 160);
    requireString(team.joinCode, "Team join code", 50);
    requireDate(team.createdAt, "Team creation date");
  }
  for (const membership of memberships) {
    requireString(membership.id, "Membership id", 200);
    requireString(membership.teamId, "Membership team id", 200);
    requireString(membership.coachId, "Membership coach id", 160);
    requireString(membership.athleteAccountId, "Membership athlete id", 160);
    requireDate(membership.joinedAt, "Membership join date");
  }
  for (const test of testHistory) {
    requireString(test.id, "Test id", 200);
    requireString(test.athleteId, "Test athlete id", 200);
    requireString(test.athleteName, "Test athlete name", 160);
    requireDate(test.date, "Test date");
    requireDate(test.createdAt, "Test creation date");
  }

  return {
    account: { ...account, email },
    athletes,
    programs,
    logs,
    teams,
    memberships,
    testHistory,
  };
}

async function resolveSyncAccount(sql, req, snapshot = null) {
  const legacyDemoEnabled = process.env.DEMO_MODE === "true";
  const sessionAccount = await getAuthenticatedAccount(sql, req, { required: !legacyDemoEnabled });
  if (sessionAccount) {
    if (snapshot && snapshot.account.id !== sessionAccount.id) {
      throw forbidden("Snapshot account does not match the authenticated account.");
    }
    return { account: sessionAccount, needsInsert: false };
  }

  if (!legacyDemoEnabled) {
    throw new HttpError(401, "Authentication is required.", "authentication_required");
  }

  const headers = requireSyncHeaders(req);
  const rows = await sql`SELECT * FROM bbp_accounts WHERE id = ${headers.accountId} LIMIT 1`;
  const account = rows[0];
  if (account) {
    if (!opaqueTokenMatchesHash(headers.syncToken, account.sync_token_hash)) {
      throw new HttpError(401, "invalid sync credentials", "invalid_credentials");
    }
    if (!PUBLIC_REGISTRATION_ROLES.has(account.role)) {
      throw forbidden("Elevated roles must use an authenticated session for sync.");
    }
    if (snapshot && snapshot.account.id !== account.id) {
      throw forbidden("Snapshot account does not match the authenticated account.");
    }
    return { account, needsInsert: false };
  }

  if (!snapshot) return { account: null, needsInsert: false };
  if (snapshot.account.id !== headers.accountId || snapshot.account.syncToken !== headers.syncToken) {
    throw forbidden("Snapshot account does not match the sync credentials.");
  }
  const requestedRole = String(snapshot.account.role || "athlete").toLowerCase();
  if (!PUBLIC_REGISTRATION_ROLES.has(requestedRole)) {
    throw new HttpError(400, "Legacy sync can create athlete or coach accounts only.", "invalid_role");
  }

  return {
    account: {
      ...snapshot.account,
      role: requestedRole,
      created_at: snapshot.account.createdAt,
      sync_token_hash: hashOpaqueToken(headers.syncToken),
    },
    needsInsert: true,
  };
}

function mapAthlete(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    savedAt: row.saved_at,
    combatProfile: row.combat_profile,
    athleteProfile: row.athlete_profile,
  };
}

function mapProgram(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    athleteId: row.athlete_id,
    athleteName: row.athlete_name,
    savedAt: row.saved_at,
    combatProfile: row.combat_profile,
    combatLoad: row.combat_load,
    athleteProfile: row.athlete_profile,
    programSettings: row.program_settings,
    assessment: row.assessment,
    program: row.program,
  };
}

function mapLog(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    athleteId: row.athlete_id,
    athleteName: row.athlete_name,
    date: row.log_date,
    week: row.week,
    day: row.day,
    status: row.status,
    readiness: row.readiness,
    notes: row.notes,
    sessionRpe: row.session_rpe,
    bodyWeightKg: row.body_weight_kg,
    painNote: row.pain_note,
    createdAt: row.created_at,
  };
}

function mapSafeTeamSummary(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: String(row.payload?.name || ""),
    createdAt: row.created_at ?? row.payload?.createdAt,
  };
}

async function getSnapshot(sql, account) {
  const [athletes, programs, ownLogs, ownedTeams, memberships, ownTestHistory] = await Promise.all([
    sql`SELECT * FROM bbp_athletes WHERE owner_id = ${account.id} ORDER BY saved_at DESC LIMIT 100`,
    sql`SELECT * FROM bbp_programs WHERE owner_id = ${account.id} ORDER BY saved_at DESC LIMIT 200`,
    sql`SELECT * FROM bbp_training_logs WHERE owner_id = ${account.id} ORDER BY created_at DESC LIMIT 500`,
    sql`SELECT payload FROM bbp_teams WHERE owner_id = ${account.id} ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT payload FROM bbp_team_memberships WHERE coach_id = ${account.id} OR athlete_account_id = ${account.id} ORDER BY joined_at DESC LIMIT 500`,
    sql`SELECT payload FROM bbp_test_history WHERE owner_id = ${account.id} ORDER BY test_date DESC LIMIT 500`,
  ]);
  const membershipPayloads = memberships.map((row) => row.payload);
  const joinedTeamIds = account.role === "athlete"
    ? [...new Set(
      membershipPayloads
        .filter((item) => item.athleteAccountId === account.id)
        .map((item) => item.teamId),
    )]
    : [];
  const joinedTeams = joinedTeamIds.length
    ? await sql`
      SELECT id, owner_id, payload, created_at FROM bbp_teams
      WHERE id = ANY(${joinedTeamIds})
      ORDER BY created_at DESC
      LIMIT 100
    `
    : [];
  const memberIds = ["coach", "admin"].includes(account.role)
    ? [...new Set(membershipPayloads.filter((item) => item.coachId === account.id).map((item) => item.athleteAccountId))]
    : [];
  const memberLogs = (
    await Promise.all(memberIds.map((id) => sql`SELECT * FROM bbp_training_logs WHERE owner_id = ${id} ORDER BY created_at DESC LIMIT 100`))
  ).flat();
  const memberTestHistory = (
    await Promise.all(memberIds.map((id) => sql`SELECT payload FROM bbp_test_history WHERE owner_id = ${id} ORDER BY test_date DESC LIMIT 100`))
  ).flat();

  return {
    account: mapAccount(account),
    athletes: athletes.map(mapAthlete),
    programs: programs.map(mapProgram),
    logs: [...ownLogs, ...memberLogs].map(mapLog),
    teams: account.role === "athlete"
      ? joinedTeams.map(mapSafeTeamSummary)
      : ownedTeams.map((row) => row.payload),
    memberships: membershipPayloads,
    testHistory: [...ownTestHistory, ...memberTestHistory].map((row) => row.payload),
  };
}

function assertOwner(item, accountId, label) {
  if (item.ownerId && item.ownerId !== accountId) throw forbidden(`${label.toLowerCase()} owner mismatch`);
}

function validateSnapshotAuthority(snapshot, account) {
  const { athletes, programs, logs, teams, memberships, testHistory } = snapshot;

  athletes.forEach((item) => assertOwner(item, account.id, "Athlete"));
  programs.forEach((item) => assertOwner(item, account.id, "Program"));
  logs.forEach((item) => assertOwner(item, account.id, "Training log"));
  if (teams.length) requireRole(account, ["coach", "admin"]);
  teams.forEach((item) => assertOwner(item, account.id, "Team"));

  for (const membership of memberships) {
    if (account.role === "athlete" && membership.athleteAccountId !== account.id) {
      throw forbidden("Athletes can only sync their own memberships.");
    }
    if (["coach", "admin"].includes(account.role) && membership.coachId !== account.id) {
      throw forbidden("Coaches can only sync memberships for their own teams.");
    }
    if (!["athlete", "coach", "admin"].includes(account.role)) {
      throw forbidden("This role cannot manage team memberships.");
    }
  }

  testHistory.forEach((item) => assertOwner(item, account.id, "Test history"));
}

function uniqueIds(items) {
  return [...new Set(items.map((item) => item.id))];
}

function assertDatabaseOwners(rows, accountId, label) {
  if (rows.some((row) => row.owner_id !== accountId)) {
    throw forbidden(`${label} belongs to another account.`);
  }
}

async function preflightSnapshot(sql, snapshot, account, needsAccountInsert) {
  const { athletes, programs, logs, teams, memberships, testHistory } = snapshot;
  const athleteIds = uniqueIds(athletes);
  const programIds = uniqueIds(programs);
  const logIds = uniqueIds(logs);
  const teamIds = [...new Set([...uniqueIds(teams), ...memberships.map((item) => item.teamId)])];
  const membershipIds = uniqueIds(memberships);
  const testIds = uniqueIds(testHistory);
  const athleteAccountIds = [...new Set(memberships.map((item) => item.athleteAccountId))];

  const [emailRows, athleteRows, programRows, logRows, teamRows, membershipRows, testRows, athleteAccountRows] = await Promise.all([
    needsAccountInsert
      ? sql`SELECT id FROM bbp_accounts WHERE LOWER(email) = LOWER(${account.email}) LIMIT 1`
      : [],
    athleteIds.length ? sql`SELECT id, owner_id FROM bbp_athletes WHERE id = ANY(${athleteIds})` : [],
    programIds.length ? sql`SELECT id, owner_id FROM bbp_programs WHERE id = ANY(${programIds})` : [],
    logIds.length ? sql`SELECT id, owner_id FROM bbp_training_logs WHERE id = ANY(${logIds})` : [],
    teamIds.length ? sql`SELECT id, owner_id FROM bbp_teams WHERE id = ANY(${teamIds})` : [],
    membershipIds.length
      ? sql`SELECT id, coach_id, athlete_account_id FROM bbp_team_memberships WHERE id = ANY(${membershipIds})`
      : [],
    testIds.length ? sql`SELECT id, owner_id FROM bbp_test_history WHERE id = ANY(${testIds})` : [],
    athleteAccountIds.length
      ? sql`SELECT id FROM bbp_accounts WHERE id = ANY(${athleteAccountIds})`
      : [],
  ]);

  if (emailRows[0]) {
    throw new HttpError(409, "An account with this id or email already exists.", "account_exists");
  }
  assertDatabaseOwners(athleteRows, account.id, "Athlete");
  assertDatabaseOwners(programRows, account.id, "Program");
  assertDatabaseOwners(logRows, account.id, "Training log");
  assertDatabaseOwners(teamRows.filter((row) => teams.some((team) => team.id === row.id)), account.id, "Team");

  const teamOwners = new Map(teamRows.map((row) => [row.id, row.owner_id]));
  teams.forEach((team) => teamOwners.set(team.id, account.id));
  const knownAthleteAccounts = new Set(athleteAccountRows.map((row) => row.id));
  knownAthleteAccounts.add(account.id);
  const databaseMemberships = new Map(membershipRows.map((row) => [row.id, row]));
  const seenMemberships = new Map();
  for (const membership of memberships) {
    if (teamOwners.get(membership.teamId) !== membership.coachId) {
      throw forbidden("Membership team does not belong to the specified coach.");
    }
    if (!knownAthleteAccounts.has(membership.athleteAccountId)) {
      throw new HttpError(400, "Membership athlete account does not exist.", "invalid_membership");
    }
    const conflictsWith = seenMemberships.get(membership.id) || databaseMemberships.get(membership.id);
    if (conflictsWith && (
      (conflictsWith.coachId ?? conflictsWith.coach_id) !== membership.coachId
      || (conflictsWith.athleteAccountId ?? conflictsWith.athlete_account_id) !== membership.athleteAccountId
    )) {
      throw forbidden("Membership belongs to another account.");
    }
    seenMemberships.set(membership.id, membership);
  }
  assertDatabaseOwners(testRows, account.id, "Test history");
}

function buildSnapshotQueries(sql, snapshot, account, needsAccountInsert) {
  const { athletes, programs, logs, teams, memberships, testHistory } = snapshot;
  const queries = [];

  if (needsAccountInsert) {
    queries.push(sql`
      INSERT INTO bbp_accounts (id, name, email, role, created_at, sync_token_hash)
      VALUES (${account.id}, ${account.name}, ${account.email}, ${account.role}, ${account.created_at}, ${account.sync_token_hash})
      RETURNING id
    `);
  }

  for (const athlete of athletes) {
    queries.push(sql`
      INSERT INTO bbp_athletes (id, owner_id, saved_at, combat_profile, athlete_profile)
      VALUES (${athlete.id}, ${account.id}, ${athlete.savedAt}, ${athlete.combatProfile}, ${JSON.stringify(athlete.athleteProfile)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        owner_id = CASE WHEN bbp_athletes.owner_id = EXCLUDED.owner_id THEN bbp_athletes.owner_id ELSE NULL END,
        saved_at = EXCLUDED.saved_at,
        combat_profile = EXCLUDED.combat_profile,
        athlete_profile = EXCLUDED.athlete_profile
      RETURNING id
    `);
  }

  for (const program of programs) {
    queries.push(sql`
      INSERT INTO bbp_programs (
        id, owner_id, athlete_id, athlete_name, saved_at, combat_profile,
        combat_load, athlete_profile, program_settings, assessment, program
      )
      VALUES (
        ${program.id}, ${account.id}, ${program.athleteId}, ${program.athleteName}, ${program.savedAt}, ${program.combatProfile},
        ${JSON.stringify(program.combatLoad)}::jsonb, ${JSON.stringify(program.athleteProfile)}::jsonb,
        ${JSON.stringify(program.programSettings)}::jsonb, ${JSON.stringify(program.assessment)}::jsonb, ${JSON.stringify(program.program)}::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        owner_id = CASE WHEN bbp_programs.owner_id = EXCLUDED.owner_id THEN bbp_programs.owner_id ELSE NULL END,
        athlete_id = EXCLUDED.athlete_id,
        athlete_name = EXCLUDED.athlete_name,
        saved_at = EXCLUDED.saved_at,
        combat_profile = EXCLUDED.combat_profile,
        combat_load = EXCLUDED.combat_load,
        athlete_profile = EXCLUDED.athlete_profile,
        program_settings = EXCLUDED.program_settings,
        assessment = EXCLUDED.assessment,
        program = EXCLUDED.program
      RETURNING id
    `);
  }

  for (const log of logs) {
    queries.push(sql`
      INSERT INTO bbp_training_logs (
        id, owner_id, athlete_id, athlete_name, log_date, week, day,
        status, readiness, notes, session_rpe, body_weight_kg, pain_note, created_at
      )
      VALUES (
        ${log.id}, ${account.id}, ${log.athleteId}, ${log.athleteName}, ${log.date},
        ${log.week}, ${log.day}, ${log.status}, ${log.readiness}, ${log.notes || ""},
        ${log.sessionRpe ?? null}, ${log.bodyWeightKg ?? null}, ${log.painNote || ""}, ${log.createdAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        owner_id = CASE WHEN bbp_training_logs.owner_id = EXCLUDED.owner_id THEN bbp_training_logs.owner_id ELSE NULL END,
        athlete_id = EXCLUDED.athlete_id,
        athlete_name = EXCLUDED.athlete_name,
        log_date = EXCLUDED.log_date,
        week = EXCLUDED.week,
        day = EXCLUDED.day,
        status = EXCLUDED.status,
        readiness = EXCLUDED.readiness,
        notes = EXCLUDED.notes,
        session_rpe = EXCLUDED.session_rpe,
        body_weight_kg = EXCLUDED.body_weight_kg,
        pain_note = EXCLUDED.pain_note
      RETURNING id
    `);
  }

  for (const team of teams) {
    const payload = JSON.stringify({ ...team, ownerId: account.id });
    queries.push(sql`
      INSERT INTO bbp_teams (id, owner_id, payload, created_at)
      VALUES (${team.id}, ${account.id}, ${payload}::jsonb, ${team.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        owner_id = CASE WHEN bbp_teams.owner_id = EXCLUDED.owner_id THEN bbp_teams.owner_id ELSE NULL END,
        payload = EXCLUDED.payload,
        created_at = EXCLUDED.created_at
      RETURNING id
    `);
  }

  for (const membership of memberships) {
    const payload = JSON.stringify(membership);
    queries.push(sql`
      INSERT INTO bbp_team_memberships (id, coach_id, athlete_account_id, payload, joined_at)
      VALUES (${membership.id}, ${membership.coachId}, ${membership.athleteAccountId}, ${payload}::jsonb, ${membership.joinedAt})
      ON CONFLICT (id) DO UPDATE SET
        coach_id = CASE
          WHEN bbp_team_memberships.coach_id = EXCLUDED.coach_id
            AND bbp_team_memberships.athlete_account_id = EXCLUDED.athlete_account_id
          THEN bbp_team_memberships.coach_id
          ELSE NULL
        END,
        athlete_account_id = bbp_team_memberships.athlete_account_id,
        payload = EXCLUDED.payload,
        joined_at = EXCLUDED.joined_at
      RETURNING id
    `);
  }

  for (const test of testHistory) {
    const payload = JSON.stringify({ ...test, ownerId: account.id });
    queries.push(sql`
      INSERT INTO bbp_test_history (id, owner_id, athlete_id, athlete_name, test_date, payload, created_at)
      VALUES (${test.id}, ${account.id}, ${test.athleteId}, ${test.athleteName}, ${test.date}, ${payload}::jsonb, ${test.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        owner_id = CASE WHEN bbp_test_history.owner_id = EXCLUDED.owner_id THEN bbp_test_history.owner_id ELSE NULL END,
        athlete_id = EXCLUDED.athlete_id,
        athlete_name = EXCLUDED.athlete_name,
        test_date = EXCLUDED.test_date,
        payload = EXCLUDED.payload
      RETURNING id
    `);
  }

  return queries;
}

async function upsertSnapshot(sql, snapshot, account, needsAccountInsert) {
  const hasWrites = needsAccountInsert || Object.keys(COLLECTION_LIMITS).some((key) => snapshot[key].length);
  if (!hasWrites) return;

  try {
    await sql.transaction((transactionSql) => buildSnapshotQueries(transactionSql, snapshot, account, needsAccountInsert));
  } catch (error) {
    if (needsAccountInsert && error?.code === "23505") {
      throw new HttpError(409, "An account with this id or email already exists.", "account_exists");
    }
    if (error?.code === "23502" && ["owner_id", "coach_id"].includes(error?.column)) {
      throw forbidden("Snapshot ownership changed during sync.");
    }
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureDatabaseSchema(sql);

    if (req.method === "GET") {
      const { account } = await resolveSyncAccount(sql, req);
      if (!account) return json(res, 404, { error: "account not found" });
      return json(res, 200, await getSnapshot(sql, account));
    }

    if (req.method === "POST") {
      requireJsonContentType(req);
      const snapshot = validateSnapshot(await readJsonBody(req, { maxBytes: SYNC_BODY_LIMIT }));
      const { account, needsInsert } = await resolveSyncAccount(sql, req, snapshot);
      validateSnapshotAuthority(snapshot, account);
      await preflightSnapshot(sql, snapshot, account, needsInsert);
      await upsertSnapshot(sql, snapshot, account, needsInsert);
      return json(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    throw new HttpError(405, "Method not allowed.", "method_not_allowed");
  } catch (error) {
    return errorResponse(res, error, "Sync service failed.");
  }
}
