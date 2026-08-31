#!/usr/bin/env tsx
/**
 * One-time BTAM PII re-encryption.
 *
 * Run AFTER adding BTAM_ENCRYPTION_KEY to .env but BEFORE rotating JWT_SECRET.
 * For every encrypted PII column, decrypts with the current decrypt chain
 * (which still knows the old cookieSecret) and re-encrypts with
 * v3(BTAM_ENCRYPTION_KEY), so a subsequent JWT_SECRET rotation cannot orphan
 * the existing BTAM data.
 *
 * Usage:
 *   cd ~/staging
 *   npx tsx scripts/reencrypt-btam.ts
 *
 * Safe to run more than once (idempotent for rows already on v3).
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { encryptPII, decryptPII } from "../server/btamEncryption";

const TARGETS: Array<{ table: string; column: string }> = [
  { table: "btam_subjects", column: "subjectAlias" },
  { table: "btam_subjects", column: "subjectContact" },
  { table: "btam_referral_intake", column: "targetDescription" },
  { table: "btam_case_notes", column: "content" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing in .env");
  const conn = await mysql.createConnection(url);

  let reencrypted = 0;
  let skipped = 0;

  for (const { table, column } of TARGETS) {
    const [rows] = await conn.query(
      `SELECT id, \`${column}\` AS val FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` <> ''`
    );
    for (const row of rows as Array<{ id: number; val: string }>) {
      const plain = decryptPII(row.val);
      if (plain == null) {
        skipped++;
        console.warn(`SKIP ${table}.${column} id=${row.id}: decrypt returned null (plaintext/corrupt) — left unchanged`);
        continue;
      }
      const next = encryptPII(plain);
      if (next == null) {
        skipped++;
        continue;
      }
      await conn.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`, [next, row.id]);
      reencrypted++;
    }
  }

  console.log(`BTAM re-encryption complete: re-encrypted=${reencrypted} skipped=${skipped}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});