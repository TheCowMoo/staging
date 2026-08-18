// Reusable validation for drizzle/full_sync.sql.
// Imports the generated schema into a scratch MySQL DB (fs_schema_check),
// verifies all tables + key columns, then drops the scratch DB.
//
// Usage: node scripts/verify-full-sync.mjs
// Requires DATABASE_URL in .env (mysql2 + dotenv are project deps).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dir, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const sql = fs.readFileSync(path.resolve(dir, "../drizzle/full_sync.sql"), "utf8");
const dbName = "fs_schema_check";

const admin = await mysql.createConnection(url);
try {
  await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const db = await mysql.createConnection(url.replace(/\/[^/]+$/, `/${dbName}`));

  const statements = sql.split(/;\s*\r?\n/).map((s) => s.trim()).filter((s) => s.length > 0);
  for (const stmt of statements) {
    await db.query(stmt);
  }
  console.log(`Executed ${statements.length} statements without error.`);

  const [tables] = await db.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
    [dbName]
  );
  console.log(`Tables in scratch DB: ${tables.length}`);

  const checks = [
    ["flagged_visitors", ["flagLevel", "photoFileKey", "reason", "addedByUserId", "lastEscalatedAt"]],
    ["users", ["role"]],
    ["organizations", ["websiteResourceLinks", "slug"]],
    ["drill_templates", ["content", "generationMode", "drillType"]],
    ["liability_scans", ["riskMapLevel", "categoryBreakdown", "advisorSummary"]],
    ["btam_wavr_assessments", ["assessorId", "computedConcernLevel", "totalWeightedScore"]],
    ["micro_drill_assignments", ["org_id", "step1_choice"]],
    ["notifications", ["user_id", "metadata"]],
  ];
  let allOk = true;
  for (const [t, cols] of checks) {
    const [c] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [dbName, t]
    );
    const names = c.map((r) => r.COLUMN_NAME);
    const missing = cols.filter((x) => !names.includes(x));
    const tag = missing.length ? `MISSING: ${missing.join(", ")}` : "ok";
    if (missing.length) allOk = false;
    console.log(`${t}: ${names.length} cols — ${tag}`);
  }

  await admin.query(`DROP DATABASE \`${dbName}\``);
  console.log(allOk ? "VALIDATION PASSED — scratch DB dropped." : "VALIDATION FAILED (see above).");
  process.exit(allOk ? 0 : 1);
} catch (err) {
  console.error("VALIDATION FAILED:", err.message);
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  } catch {}
  process.exit(1);
}
