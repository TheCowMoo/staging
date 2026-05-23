/**
 * One-time migration: add `jurisdiction` column to `facilities` table.
 * Run with: npx tsx server/migrate_jurisdiction.ts
 */
import { createConnection } from "mysql2/promise";

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL!);
  try {
    // Check if column already exists
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facilities' AND COLUMN_NAME = 'jurisdiction'`
    );
    if ((rows as any[]).length > 0) {
      console.log("Column 'jurisdiction' already exists — skipping.");
    } else {
      await conn.execute(
        `ALTER TABLE facilities ADD COLUMN jurisdiction VARCHAR(64) DEFAULT 'United States' AFTER state`
      );
      console.log("Added 'jurisdiction' column to facilities table.");
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
