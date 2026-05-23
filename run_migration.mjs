import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = `CREATE TABLE IF NOT EXISTS \`flagged_visitors\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`reason\` text,
  \`addedByUserId\` int NOT NULL,
  \`facilityId\` int,
  \`active\` boolean NOT NULL DEFAULT true,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`flagged_visitors_id\` PRIMARY KEY(\`id\`)
)`;

const conn = await mysql.createConnection(DATABASE_URL);
try {
  await conn.execute(sql);
  console.log("✓ flagged_visitors table created (or already exists)");
} finally {
  await conn.end();
}
