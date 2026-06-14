import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const error = new Error("DATABASE_URL is not configured");
    error.statusCode = 503;
    throw error;
  }
  return neon(databaseUrl);
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`ALTER TABLE bbp_accounts ADD COLUMN IF NOT EXISTS sync_token_hash TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_athletes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      saved_at TIMESTAMPTZ NOT NULL,
      combat_profile TEXT NOT NULL,
      athlete_profile JSONB NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_programs (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      athlete_id TEXT NOT NULL,
      athlete_name TEXT NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL,
      combat_profile TEXT NOT NULL,
      combat_load JSONB NOT NULL,
      athlete_profile JSONB NOT NULL,
      program_settings JSONB NOT NULL,
      assessment JSONB NOT NULL,
      program JSONB NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_training_logs (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      athlete_id TEXT NOT NULL,
      athlete_name TEXT NOT NULL,
      log_date DATE NOT NULL,
      week INTEGER NOT NULL,
      day TEXT NOT NULL,
      status TEXT NOT NULL,
      readiness INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      session_rpe INTEGER,
      body_weight_kg NUMERIC,
      pain_note TEXT,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`ALTER TABLE bbp_training_logs ADD COLUMN IF NOT EXISTS session_rpe INTEGER`;
  await sql`ALTER TABLE bbp_training_logs ADD COLUMN IF NOT EXISTS body_weight_kg NUMERIC`;
  await sql`ALTER TABLE bbp_training_logs ADD COLUMN IF NOT EXISTS pain_note TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_teams (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_team_memberships (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      athlete_account_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_test_history (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      athlete_id TEXT NOT NULL,
      athlete_name TEXT NOT NULL,
      test_date DATE NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS bbp_athletes_owner_idx ON bbp_athletes(owner_id)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_programs_owner_idx ON bbp_programs(owner_id, saved_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_logs_owner_idx ON bbp_training_logs(owner_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_teams_owner_idx ON bbp_teams(owner_id)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_memberships_coach_idx ON bbp_team_memberships(coach_id)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_memberships_athlete_idx ON bbp_team_memberships(athlete_account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_test_history_owner_idx ON bbp_test_history(owner_id, test_date DESC)`;
}

function hashToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

function requireSyncHeaders(req) {
  const accountId = req.headers["x-bbp-account-id"];
  const syncToken = req.headers["x-bbp-sync-token"];
  if (!accountId || !syncToken) {
    const error = new Error("sync credentials are required");
    error.statusCode = 401;
    throw error;
  }
  return {
    accountId: Array.isArray(accountId) ? accountId[0] : accountId,
    syncToken: Array.isArray(syncToken) ? syncToken[0] : syncToken,
  };
}

async function authenticateSync(sql, req) {
  const { accountId, syncToken } = requireSyncHeaders(req);
  const rows = await sql`SELECT * FROM bbp_accounts WHERE id = ${accountId} LIMIT 1`;
  const account = rows[0];
  if (!account) return null;
  if (!account.sync_token_hash || account.sync_token_hash !== hashToken(syncToken)) {
    const error = new Error("invalid sync credentials");
    error.statusCode = 401;
    throw error;
  }
  return account;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
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

async function getSnapshot(sql, account) {
  const [athletes, programs, ownLogs] = await Promise.all([
    sql`SELECT * FROM bbp_athletes WHERE owner_id = ${account.id} ORDER BY saved_at DESC LIMIT 100`,
    sql`SELECT * FROM bbp_programs WHERE owner_id = ${account.id} ORDER BY saved_at DESC LIMIT 200`,
    sql`SELECT * FROM bbp_training_logs WHERE owner_id = ${account.id} ORDER BY created_at DESC LIMIT 500`,
  ]);
  const [teams, memberships, ownTestHistory] = await Promise.all([
    sql`SELECT payload FROM bbp_teams WHERE owner_id = ${account.id} ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT payload FROM bbp_team_memberships WHERE coach_id = ${account.id} OR athlete_account_id = ${account.id} ORDER BY joined_at DESC LIMIT 500`,
    sql`SELECT payload FROM bbp_test_history WHERE owner_id = ${account.id} ORDER BY test_date DESC LIMIT 500`,
  ]);
  const membershipPayloads = memberships.map((row) => row.payload);
  const memberIds = [...new Set(membershipPayloads.filter((membership) => membership.coachId === account.id).map((membership) => membership.athleteAccountId))];
  const memberLogs = (await Promise.all(memberIds.map((id) => sql`SELECT * FROM bbp_training_logs WHERE owner_id = ${id} ORDER BY created_at DESC LIMIT 100`))).flat();
  const memberTestHistory = (await Promise.all(memberIds.map((id) => sql`SELECT payload FROM bbp_test_history WHERE owner_id = ${id} ORDER BY test_date DESC LIMIT 100`))).flat();

  return {
    account: mapAccount(account),
    athletes: athletes.map(mapAthlete),
    programs: programs.map(mapProgram),
    logs: [...ownLogs, ...memberLogs].map(mapLog),
    teams: teams.map((row) => row.payload),
    memberships: membershipPayloads,
    testHistory: [...ownTestHistory, ...memberTestHistory].map((row) => row.payload),
  };
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

async function upsertSnapshot(sql, snapshot, existingAccount = null, syncHeaders = null) {
  const { account, athletes = [], programs = [], logs = [], teams = [], memberships = [], testHistory = [] } = snapshot;
  if (!account?.id || !account.email || !account.syncToken) {
    const error = new Error("Snapshot account is required");
    error.statusCode = 400;
    throw error;
  }
  if (syncHeaders && syncHeaders.accountId !== account.id) {
    throw forbidden("snapshot account does not match sync credentials");
  }
  if (!existingAccount && syncHeaders && hashToken(account.syncToken) !== hashToken(syncHeaders.syncToken)) {
    throw forbidden("snapshot token does not match sync credentials");
  }
  if (existingAccount && (existingAccount.id !== account.id || existingAccount.email.toLowerCase() !== account.email.toLowerCase())) {
    throw forbidden("snapshot account does not match sync credentials");
  }
  const role = account.role === "coach" || account.role === "athlete" || account.role === "admin" ? account.role : "athlete";
  const syncTokenHash = existingAccount?.sync_token_hash || hashToken(account.syncToken);

  await sql`
    INSERT INTO bbp_accounts (id, name, email, role, created_at, sync_token_hash)
    VALUES (${account.id}, ${account.name}, ${account.email}, ${role}, ${account.createdAt}, ${syncTokenHash})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      sync_token_hash = COALESCE(bbp_accounts.sync_token_hash, EXCLUDED.sync_token_hash)
  `;

  for (const athlete of athletes) {
    if (athlete.ownerId && athlete.ownerId !== account.id) throw forbidden("athlete owner mismatch");
    await sql`
      INSERT INTO bbp_athletes (id, owner_id, saved_at, combat_profile, athlete_profile)
      VALUES (${athlete.id}, ${account.id}, ${athlete.savedAt}, ${athlete.combatProfile}, ${JSON.stringify(athlete.athleteProfile)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        saved_at = EXCLUDED.saved_at,
        combat_profile = EXCLUDED.combat_profile,
        athlete_profile = EXCLUDED.athlete_profile
    `;
  }

  for (const program of programs) {
    if (program.ownerId && program.ownerId !== account.id) throw forbidden("program owner mismatch");
    await sql`
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
        athlete_id = EXCLUDED.athlete_id,
        athlete_name = EXCLUDED.athlete_name,
        saved_at = EXCLUDED.saved_at,
        combat_profile = EXCLUDED.combat_profile,
        combat_load = EXCLUDED.combat_load,
        athlete_profile = EXCLUDED.athlete_profile,
        program_settings = EXCLUDED.program_settings,
        assessment = EXCLUDED.assessment,
        program = EXCLUDED.program
    `;
  }

  for (const log of logs) {
    if (log.ownerId && log.ownerId !== account.id) throw forbidden("log owner mismatch");
    await sql`
      INSERT INTO bbp_training_logs (
        id, owner_id, athlete_id, athlete_name, log_date, week, day,
        status, readiness, notes, session_rpe, body_weight_kg, pain_note, created_at
      )
      VALUES (
        ${log.id}, ${account.id}, ${log.athleteId}, ${log.athleteName}, ${log.date},
        ${log.week}, ${log.day}, ${log.status}, ${log.readiness}, ${log.notes || ""},
        ${log.sessionRpe || null}, ${log.bodyWeightKg || null}, ${log.painNote || ""}, ${log.createdAt}
      )
      ON CONFLICT (id) DO UPDATE SET
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
    `;
  }

  for (const team of teams) {
    if (team.ownerId && team.ownerId !== account.id) throw forbidden("team owner mismatch");
    await sql`
      INSERT INTO bbp_teams (id, owner_id, payload, created_at)
      VALUES (${team.id}, ${account.id}, ${JSON.stringify({ ...team, ownerId: account.id })}::jsonb, ${team.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        created_at = EXCLUDED.created_at
    `;
  }

  for (const membership of memberships) {
    const canWrite = membership.coachId === account.id || membership.athleteAccountId === account.id;
    if (!canWrite) throw forbidden("membership owner mismatch");
    await sql`
      INSERT INTO bbp_team_memberships (id, coach_id, athlete_account_id, payload, joined_at)
      VALUES (${membership.id}, ${membership.coachId}, ${membership.athleteAccountId}, ${JSON.stringify(membership)}::jsonb, ${membership.joinedAt})
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        joined_at = EXCLUDED.joined_at
    `;
  }

  for (const test of testHistory) {
    if (test.ownerId && test.ownerId !== account.id) throw forbidden("test history owner mismatch");
    await sql`
      INSERT INTO bbp_test_history (id, owner_id, athlete_id, athlete_name, test_date, payload, created_at)
      VALUES (${test.id}, ${account.id}, ${test.athleteId}, ${test.athleteName}, ${test.date}, ${JSON.stringify({ ...test, ownerId: account.id })}::jsonb, ${test.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        athlete_id = EXCLUDED.athlete_id,
        athlete_name = EXCLUDED.athlete_name,
        test_date = EXCLUDED.test_date,
        payload = EXCLUDED.payload
    `;
  }
}

export default async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === "GET") {
      const account = await authenticateSync(sql, req);
      if (!account) return json(res, 404, { error: "account not found" });
      const snapshot = await getSnapshot(sql, account);
      return json(res, 200, snapshot);
    }

    if (req.method === "POST") {
      const snapshot = await readBody(req);
      const headers = requireSyncHeaders(req);
      const existingRows = await sql`SELECT * FROM bbp_accounts WHERE id = ${headers.accountId} LIMIT 1`;
      const existingAccount = existingRows[0] || null;
      if (existingAccount && existingAccount.sync_token_hash !== hashToken(headers.syncToken)) {
        return json(res, 401, { error: "invalid sync credentials" });
      }
      await upsertSnapshot(sql, snapshot, existingAccount, headers);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "method not allowed" });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || "sync failed" });
  }
}
