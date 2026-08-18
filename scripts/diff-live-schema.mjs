#!/usr/bin/env node
/**
 * Live-DB schema drift diff.
 *
 * Compares the database in DATABASE_URL (.env) against drizzle/full_sync.sql
 * (the authoritative schema generated from drizzle/schema.ts) and reports:
 *   - missing tables, extra tables
 *   - missing columns (fixable with ADD COLUMN — safe, non-destructive)
 *   - extra columns (informational — DROP COLUMN candidates, review first)
 *   - type / nullability mismatches (fixable with MODIFY COLUMN — review first)
 *
 * Usage:
 *   node scripts/diff-live-schema.mjs                  # read-only report
 *   node scripts/diff-live-schema.mjs --write-fixes    # also write drizzle/live_schema_fixes.sql
 *
 * The generated fix file is ordered: missing tables first (CREATE TABLE IF
 * NOT EXISTS), then ADD COLUMN (safe), then MODIFY COLUMN (review carefully).
 * Apply with:  mysql -u root -p safeguard < drizzle/live_schema_fixes.sql
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dir, "../.env") });

const fullSyncPath = path.resolve(dir, "../drizzle/full_sync.sql");
const outPath = path.resolve(dir, "../drizzle/live_schema_fixes.sql");
const writeFixes = process.argv.includes("--write-fixes");

/** Normalize a SQL column type for comparison (MySQL reports boolean as tinyint(1)). */
function normalizeType(t) {
  let s = String(t ?? "").trim().toLowerCase();
  if (s === "boolean") s = "tinyint(1)";
  return s;
}

/** Parse full_sync.sql into { tableName: { colName: { type, notNull, def } } }. */
function parseFullSync(sql) {
  const tables = {};
  const tableRe = /CREATE TABLE IF NOT EXISTS `([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=InnoDB/g;
  let tm;
  while ((tm = tableRe.exec(sql)) !== null) {
    const name = tm[1];
    const cols = {};
    const colRe = /^\s*`([^`]+)`\s+([^\n]+)$/gm;
    let cm;
    while ((cm = colRe.exec(tm[2])) !== null) {
      const cname = cm[1];
      const def = cm[2].trim().replace(/,\s*$/, "");
      const typeMatch = def.match(/^([A-Za-z]+(?:\([^)]*\))?)\s*(.*)$/s);
      if (!typeMatch) continue;
      cols[cname] = {
        type: normalizeType(typeMatch[1]),
        notNull: /NOT\s+NULL/.test(def),
        def,
      };
    }
    tables[name] = cols;
  }
  return tables;
}


async function main() {
  const sql = fs.readFileSync(fullSyncPath, "utf8");
  const expected = parseFullSync(sql);
  const expectedNames = Object.keys(expected).sort();
  const tableBlocks = {};
  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS `([^`]+)`[\s\S]*?ENGINE=InnoDB[\s\S]*?;/g)) {
    tableBlocks[m[1]] = m[0].trim();
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing in .env");
  const dbName = decodeURIComponent(new URL(url.replace("mysql://", "http://")).pathname.replace(/^\//, ""));

  const conn = await mysql.createConnection(url);
  const [ver] = await conn.query("SELECT VERSION() v");
  const [rows] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [dbName]
  );
  await conn.end();

  const live = {};
  for (const r of rows) {
    if (!live[r.TABLE_NAME]) live[r.TABLE_NAME] = {};
    live[r.TABLE_NAME][r.COLUMN_NAME] = {
      type: normalizeType(r.COLUMN_TYPE),
      nullable: r.IS_NULLABLE === "YES",
    };
  }

  const missingTables = [];
  const extraTables = [];
  const missingCols = {}; // table -> [col]
  const extraCols = {}; // table -> [col]
  const mismatches = {}; // table -> [{ col, expected, actual, nullDiff }]

  for (const t of expectedNames) {
    if (!live[t]) {
      missingTables.push(t);
      continue;
    }
    for (const c of Object.keys(expected[t])) {
      const ec = expected[t][c];
      const lc = live[t][c];
      if (!lc) {
        (missingCols[t] ??= []).push(c);
        continue;
      }
      const nullDiff = lc.nullable !== !ec.notNull;
      if (lc.type !== ec.type || nullDiff) {
        (mismatches[t] ??= []).push({ col: c, expected: ec, actual: lc, nullDiff });
      }
    }
    for (const c of Object.keys(live[t])) {
      if (!expected[t][c]) (extraCols[t] ??= []).push(c);
    }
  }
  for (const t of Object.keys(live)) {
    if (!expected[t] && t !== "__drizzle_migrations") extraTables.push(t);
  }

  // ── Build fix SQL (ordered: safe first) ──────────────────────────────
  const fixes = [];
  if (missingTables.length) fixes.push("-- MISSING TABLES (safe: CREATE TABLE IF NOT EXISTS)");
  for (const t of missingTables) {
    if (tableBlocks[t]) fixes.push(tableBlocks[t]);
  }
  const addList = [];
  for (const t of Object.keys(missingCols)) {
    for (const c of missingCols[t]) {
      let def = expected[t][c].def
        .replace(/\bPRIMARY\s+KEY\b/gi, "")
        .replace(/\bUNIQUE\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      addList.push(`ALTER TABLE \`${t}\` ADD COLUMN \`${c}\` ${def};`);
    }
  }
  if (addList.length) {
    fixes.push("\n-- MISSING COLUMNS (safe: ADD COLUMN)");
    fixes.push(...addList);
  }
  const modList = [];
  for (const t of Object.keys(mismatches)) {
    for (const m of mismatches[t]) {
      const def = m.expected.def.replace(/\s+/g, " ").trim();
      modList.push(`ALTER TABLE \`${t}\` MODIFY COLUMN \`${m.col}\` ${def};`);
    }
  }
  if (modList.length) {
    fixes.push("\n-- TYPE / NULLABILITY MISMATCHES (review first: may fail if existing rows violate constraints)");
    fixes.push(...modList);
  }

  // ── Report ───────────────────────────────────────────────────────────
  console.log(`DB: ${dbName} @ ${ver[0].v}`);
  console.log(`Expected tables: ${expectedNames.length}   Live tables: ${Object.keys(live).length}`);
  console.log("\n── MISSING TABLES ──");
  console.log(missingTables.length ? missingTables.join("\n") : "(none)");
  console.log("\n── EXTRA TABLES (not in schema — legacy, review before dropping) ──");
  console.log(extraTables.length ? extraTables.join("\n") : "(none)");
  console.log("\n── MISSING COLUMNS (ADD COLUMN) ──");
  let mc = 0;
  for (const t of Object.keys(missingCols)) {
    for (const c of missingCols[t]) console.log(`  ${t}.${c}  ->  ${expected[t][c].def}`);
    mc += missingCols[t].length;
  }
  if (!mc) console.log("  (none)");
  console.log("\n── EXTRA COLUMNS (not in schema — informational) ──");
  let ec2 = 0;
  for (const t of Object.keys(extraCols)) {
    for (const c of extraCols[t]) console.log(`  ${t}.${c}`);
    ec2 += extraCols[t].length;
  }
  if (!ec2) console.log("  (none)");
  console.log("\n── TYPE / NULLABILITY MISMATCHES (MODIFY COLUMN) ──");
  let mm = 0;
  for (const t of Object.keys(mismatches)) {
    for (const m of mismatches[t]) {
      console.log(`  ${t}.${m.col}: expected ${m.expected.type}${m.expected.notNull ? " NOT NULL" : " NULL"} | actual ${m.actual.type} ${m.actual.nullable ? "NULL" : "NOT NULL"}${m.nullDiff ? "  <-- NULLABILITY DIFF" : ""}`);
      mm++;
    }
  }
  if (!mm) console.log("  (none)");

  if (writeFixes) {
    const header = `-- ============================================================\n-- live_schema_fixes.sql — generated by scripts/diff-live-schema.mjs\n-- Target: ${dbName} (MySQL ${ver[0].v})\n-- Ordered safest-first: CREATE missing tables, ADD COLUMN, then MODIFY.\n-- ============================================================\n`;
    fs.writeFileSync(outPath, header + fixes.join("\n") + "\n", "utf8");
    console.log(`\nWrote fix SQL (${fixes.length} statements) -> ${outPath}`);
  }

  const totalIssues = missingTables.length + mc + mm + extraTables.length + ec2;
  console.log(`\nSummary: ${missingTables.length} missing tables, ${mc} missing cols, ${mm} type/null diffs, ${extraTables.length} extra tables, ${ec2} extra cols.`);
  console.log(totalIssues === 0 ? "✅ NO DRIFT — DB matches full_sync.sql." : "⚠️ Drift found — see above.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
