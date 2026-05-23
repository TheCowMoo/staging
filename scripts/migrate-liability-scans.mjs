/**
 * Migration: Create liability_scans and scan_share_tokens tables
 * Run with: node scripts/migrate-liability-scans.mjs
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

console.log("Creating liability_scans table...");
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`liability_scans\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int,
    \`orgId\` int,
    \`facilityId\` int,
    \`score\` int NOT NULL,
    \`classification\` varchar(64) NOT NULL,
    \`riskMapLevel\` varchar(64) NOT NULL,
    \`riskMapColor\` varchar(16) NOT NULL,
    \`riskMapDescriptor\` text,
    \`jurisdiction\` varchar(128) NOT NULL,
    \`industry\` varchar(128) NOT NULL,
    \`topGaps\` json NOT NULL,
    \`categoryBreakdown\` json NOT NULL,
    \`immediateActions\` json NOT NULL,
    \`interpretation\` text,
    \`advisorSummary\` text,
    \`answers\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`liability_scans_id\` PRIMARY KEY(\`id\`)
  )
`);
console.log("✓ liability_scans created");

console.log("Creating scan_share_tokens table...");
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`scan_share_tokens\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`scanId\` int NOT NULL,
    \`token\` varchar(128) NOT NULL,
    \`createdByUserId\` int,
    \`expiresAt\` timestamp NOT NULL,
    \`revokedAt\` timestamp,
    \`label\` varchar(255),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`scan_share_tokens_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`scan_share_tokens_token_unique\` UNIQUE(\`token\`)
  )
`);
console.log("✓ scan_share_tokens created");

await conn.end();
console.log("Migration complete.");
