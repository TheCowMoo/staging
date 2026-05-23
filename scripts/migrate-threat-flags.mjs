import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const sql = `ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`threatFlags\` text;`;
const sql2 = `ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`maxThreatSeverity\` varchar(16);`;

try {
  await conn.execute(sql);
  console.log("✓ Added threatFlags column");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("✓ threatFlags column already exists");
  } else {
    throw e;
  }
}

try {
  await conn.execute(sql2);
  console.log("✓ Added maxThreatSeverity column");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("✓ maxThreatSeverity column already exists");
  } else {
    throw e;
  }
}

await conn.end();
console.log("Migration complete.");
