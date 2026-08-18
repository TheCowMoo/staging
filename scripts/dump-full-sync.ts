#!/usr/bin/env tsx
/**
 * Generates `drizzle/full_sync.sql` — the authoritative, idempotent MySQL schema dump
 * derived directly from `drizzle/schema.ts` (the single source of truth used by the app).
 *
 * This eliminates the recurring schema drift: the DDL is generated from the exact same
 * table/column definitions the runtime (Drizzle ORM) uses, so they cannot diverge.
 *
 * Usage:
 *   npx tsx scripts/dump-full-sync.ts            # print manifest + generated SQL to stdout
 *   npx tsx scripts/dump-full-sync.ts --write    # write drizzle/full_sync.sql
 *   npx tsx scripts/dump-full-sync.ts --inspect  # dump raw drizzle metadata for a few tables
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schemaModule from "../drizzle/schema.ts";
import { getTableConfig } from "drizzle-orm/mysql-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../drizzle/full_sync.sql");

const doWrite = process.argv.includes("--write");
const doInspect = process.argv.includes("--inspect");

/** Wrap an identifier in backticks (MySQL-safe). */
function q(v: string): string {
  return "`" + v.replace(/`/g, "``") + "`";
}

/** Render a literal value for DEFAULT clauses. */
function lit(v: unknown): string {
  if (v === true) return "true";
  if (v === false) return "false";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

/** Map a drizzle MySQL column to its SQL column type. */
function colType(col: Record<string, any>): string {
  switch (col.columnType) {
    case "MySqlInt":
    case "MySqlInteger":
      return "int";
    case "MySqlFloat":
      return "float";
    case "MySqlDouble":
      return "double";
    case "MySqlVarChar":
      return `varchar(${col.length})`;
    case "MySqlText":
    case "MySqlTinyText":
    case "MySqlMediumText":
    case "MySqlLongText":
      return "text";
    case "MySqlBoolean":
      return "boolean";
    case "MySqlTimestamp":
      return "timestamp";
    case "MySqlDateTime":
      return "datetime";
    case "MySqlDate":
      return "date";
    case "MySqlJson":
      return "json";
    case "MySqlEnumColumn":
      return `enum(${col.enumValues.map((v: unknown) => lit(v)).join(",")})`;
    case "MySqlDecimal":
      return `decimal(${col.precision},${col.scale})`;
    case "MySqlBinary":
      return "binary";
    case "MySqlVarBinary":
      return `varbinary(${col.length})`;
    default:
      throw new Error(`Unhandled drizzle columnType "${col.columnType}" (column "${col.name}")`);
  }
}

/** Render a full column definition line. */
function colDef(col: Record<string, any>): string {
  const parts: string[] = [q(col.name), colType(col)];

  // Nullability (explicit so behavior doesn't depend on server's
  // explicit_defaults_for_timestamp setting)
  parts.push(col.notNull ? "NOT NULL" : "NULL");

  // Default value
  if (col.hasDefault) {
    const dflt = col.default;
    if (dflt !== undefined && dflt !== null) {
      if (typeof dflt === "object" && dflt.queryChunks) {
        // drizzle SQL expression default (e.g. .defaultNow() -> (now()))
        let expr: unknown = dflt.queryChunks?.[0]?.value?.[0];
        if (typeof expr === "string") {
          // Normalize drizzle's (now()) to the classic CURRENT_TIMESTAMP form
          if (expr === "(now())") expr = "CURRENT_TIMESTAMP";
          parts.push(`DEFAULT ${expr}`);
        }
      } else {
        const typeSql = colType(col);
        const isLob = /^(text|json|blob)/.test(typeSql);
        const literal = lit(dflt);
        // MySQL 8.0.13+ requires BLOB/TEXT/GEOMETRY/JSON defaults to be
        // written as expressions, e.g. DEFAULT ('[]') — a bare literal fails.
        parts.push(isLob ? `DEFAULT (${literal})` : `DEFAULT ${literal}`);
      }
    } else if (dflt === null) {
      parts.push("DEFAULT NULL");
    } else if (col.hasOnUpdateNow) {
      // .onUpdateNow() implies an implicit DEFAULT CURRENT_TIMESTAMP in MySQL
      parts.push("DEFAULT CURRENT_TIMESTAMP");
    }
  }

  if (col.hasOnUpdateNow) parts.push("ON UPDATE CURRENT_TIMESTAMP");
  if (col.autoIncrement) parts.push("AUTO_INCREMENT");
  if (col.primary) parts.push("PRIMARY KEY");
  if (col.isUnique) parts.push("UNIQUE");

  return parts.join(" ");
}

/** Inspect mode: dump raw drizzle metadata so we can verify field names. */
function inspect(tableName: string): void {
  const table = (schemaModule as Record<string, any>)[tableName];
  const cfg = getTableConfig(table);
  console.log(`\n===== ${tableName} =====`);
  console.log("tableConfig keys:", Object.keys(cfg).join(", "));
  console.log("config.name:", cfg.name);
  console.log("uniqueConstraints:", JSON.stringify(cfg.uniqueConstraints));
  console.log("primaryKeys:", JSON.stringify(cfg.primaryKeys));
  for (const c of cfg.columns as Record<string, any>[]) {
    const pick: Record<string, unknown> = {
      name: c.name,
      dataType: c.dataType,
      columnType: c.columnType,
      notNull: c.notNull,
      hasDefault: c.hasDefault,
      hasDefaultFn: typeof c.defaultFn === "function",
      default: c.default,
      hasOnUpdateNow: c.hasOnUpdateNow,
      primary: c.primary,
      autoIncrement: c.autoIncrement,
      isUnique: c.isUnique,
      length: c.length,
      enumValues: c.enumValues,
    };
    console.log(JSON.stringify(pick));
  }
}

/** Build the full CREATE TABLE DDL for every exported table, in schema.ts order. */
function generateSql(): string {
  const tables: string[] = [];
  for (const key of Object.keys(schemaModule)) {
    const candidate = (schemaModule as Record<string, any>)[key];
    if (!candidate || typeof candidate !== "object") continue;
    let cfg;
    try {
      cfg = getTableConfig(candidate);
    } catch {
      continue; // not a drizzle table
    }
    if (!cfg || !cfg.name) continue;

    const cols = cfg.columns as Record<string, any>[];
    const lines = cols.map((c) => "  " + colDef(c));
    tables.push(
      `CREATE TABLE IF NOT EXISTS ${q(cfg.name)} (\n${lines.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    );
  }

  const header = `-- ============================================================
-- Five Stones Safeguard — AUTHORITATIVE FULL DB SCHEMA
-- Generated from drizzle/schema.ts by scripts/dump-full-sync.ts
-- DO NOT EDIT BY HAND — re-run the generator instead.
--
-- Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS).
-- Usage: mysql -u root -p... safeguard < full_sync.sql
-- ============================================================

SET NAMES utf8mb4;

`;
  return header + tables.join("\n\n") + `\n\nSELECT 'Full DB sync complete.' AS result;\n`;
}

if (doInspect) {
  inspect("organizations");
  inspect("users");
  inspect("liabilityScans");
  inspect("microDrillAssignments");
  console.log(
    `\nTotal tables exported from schema.ts: ${
      Object.keys(schemaModule).filter((k) => {
        try {
          return !!getTableConfig((schemaModule as any)[k]);
        } catch {
          return false;
        }
      }).length
    }`
  );
  process.exit(0);
}

const sql = generateSql();

// Manifest for verification
const tableCount = (sql.match(/^CREATE TABLE/gm) ?? []).length;
console.log(`Generated ${tableCount} CREATE TABLE statements.`);
if (doWrite) {
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`Wrote ${outPath}`);
} else {
  console.log(sql);
}

