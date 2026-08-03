import { neon } from "@neondatabase/serverless";
import { HttpError } from "./_http.js";

let cachedDatabaseUrl;
let cachedSql;
let schemaSql;
let schemaPromise;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new HttpError(503, "Database service is not configured.", "database_unavailable");
  }
  if (!cachedSql || cachedDatabaseUrl !== databaseUrl) {
    cachedDatabaseUrl = databaseUrl;
    cachedSql = neon(databaseUrl);
  }
  return cachedSql;
}

async function applyDatabaseSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS bbp_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sync_token_hash TEXT,
      password_hash TEXT
    )
  `;
  await sql`ALTER TABLE bbp_accounts ADD COLUMN IF NOT EXISTS sync_token_hash TEXT`;
  await sql`ALTER TABLE bbp_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS bbp_accounts_email_lower_idx ON bbp_accounts (LOWER(email))`;

  await sql`
    CREATE TABLE IF NOT EXISTS bbp_sessions (
      token_hash TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS bbp_sessions_account_idx ON bbp_sessions(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS bbp_sessions_expiry_idx ON bbp_sessions(expires_at)`;

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
      athlete_account_id TEXT NOT NULL REFERENCES bbp_accounts(id) ON DELETE CASCADE,
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

export function ensureDatabaseSchema(sql) {
  if (schemaSql === sql && schemaPromise) return schemaPromise;
  schemaSql = sql;
  schemaPromise = applyDatabaseSchema(sql).catch((error) => {
    if (schemaSql === sql) {
      schemaSql = undefined;
      schemaPromise = undefined;
    }
    throw error;
  });
  return schemaPromise;
}
