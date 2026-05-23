// Temporary migration script — run with: npx tsx server/run-migration.ts
import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("Failed to get DB connection");
    process.exit(1);
  }
  console.log("Connected!");

  const statements: { name: string; q: ReturnType<typeof sql> }[] = [
    {
      name: "CREATE staff_checkins",
      q: sql`CREATE TABLE IF NOT EXISTS \`staff_checkins\` (\`id\` int AUTO_INCREMENT NOT NULL, \`orgId\` int, \`facilityId\` int, \`staffName\` varchar(255) NOT NULL, \`status\` enum('reunification','injured','off_site','cannot_disclose') NOT NULL, \`location\` text, \`recordedByUserId\` int, \`createdAt\` timestamp NOT NULL DEFAULT (now()), CONSTRAINT \`staff_checkins_id\` PRIMARY KEY(\`id\`))`,
    },
    {
      name: "ADD facilities.emergencyRoles",
      q: sql`ALTER TABLE \`facilities\` ADD COLUMN \`emergencyRoles\` text`,
    },
    {
      name: "ADD facilities.aedOnSite",
      q: sql`ALTER TABLE \`facilities\` ADD COLUMN \`aedOnSite\` boolean DEFAULT false`,
    },
    {
      name: "ADD facilities.aedLocations",
      q: sql`ALTER TABLE \`facilities\` ADD COLUMN \`aedLocations\` text`,
    },
    {
      name: "ADD flagged_visitors.flagLevel",
      q: sql`ALTER TABLE \`flagged_visitors\` ADD COLUMN \`flagLevel\` enum('red','yellow') DEFAULT 'red' NOT NULL`,
    },
    {
      name: "ADD push_subscriptions.endpoint",
      q: sql`ALTER TABLE \`push_subscriptions\` ADD COLUMN \`endpoint\` varchar(512)`,
    },
    {
      name: "ADD users.rasRole",
      q: sql`ALTER TABLE \`users\` ADD COLUMN \`rasRole\` enum('admin','responder','staff')`,
    },
  ];

  for (const { name, q } of statements) {
    try {
      await db.execute(q);
      console.log(`✓ ${name}`);
    } catch (err: any) {
      if (
        err?.code === "ER_DUP_FIELDNAME" ||
        err?.code === "ER_TABLE_EXISTS_ERROR" ||
        (err?.message && (err.message.includes("Duplicate column") || err.message.includes("already exists")))
      ) {
        console.log(`⊘ SKIP (already exists): ${name}`);
      } else {
        const cause = err?.cause?.message || err?.cause?.sqlMessage || '';
      console.error(`✗ ERROR: ${name} — ${err?.message} (code: ${err?.code}) cause: ${cause}`);
      console.error('  Full error:', JSON.stringify({ code: err?.code, errno: err?.errno, sqlState: err?.sqlState, cause: { code: err?.cause?.code, msg: err?.cause?.sqlMessage } }));
      }
    }
  }

  console.log("\nMigration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
