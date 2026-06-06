#!/usr/bin/env node
/**
 * Adds leads.contact_by to production Supabase.
 *
 * Option A — Supabase Dashboard (recommended):
 *   1. Open https://supabase.com/dashboard/project/werptponkghouphenese/sql/new
 *   2. Paste and run the SQL from supabase/migrations/007_leads_contact_by.sql
 *
 * Option B — direct Postgres (if you have the DB password):
 *   SUPABASE_DB_PASSWORD=your-db-password node scripts/apply-migration-007.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PROJECT_REF = "werptponkghouphenese";
const SQL = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations/007_leads_contact_by.sql"),
  "utf8"
);

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.log("No SUPABASE_DB_PASSWORD set.\n");
  console.log("Run this SQL in the Supabase SQL Editor:\n");
  console.log(SQL);
  console.log("\nDashboard: https://supabase.com/dashboard/project/werptponkghouphenese/sql/new");
  process.exit(0);
}

const host = `db.${PROJECT_REF}.supabase.co`;
const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Install pg first: npm install pg");
  process.exit(1);
}

const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(SQL);
  console.log("Migration 007 applied successfully.");
} finally {
  await client.end();
}
