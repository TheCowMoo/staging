import mysql from 'mysql2/promise';
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const urlObj = new URL(url);
const host = urlObj.hostname;
const port = parseInt(urlObj.port) || 3306;
const user = decodeURIComponent(urlObj.username);
const password = decodeURIComponent(urlObj.password);
const database = urlObj.pathname.slice(1).split('?')[0];

console.log(`Connecting to ${host}:${port}/${database} as ${user}`);

const conn = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: true },
  connectTimeout: 30000,
});

console.log('Connected!');

const statements = [
  {
    name: 'MODIFY org_invites.inviteRole',
    sql: `ALTER TABLE \`org_invites\` MODIFY COLUMN \`inviteRole\` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'`
  },
  {
    name: 'MODIFY org_members.orgRole',
    sql: `ALTER TABLE \`org_members\` MODIFY COLUMN \`orgRole\` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'`
  },
  {
    name: 'MODIFY users.role',
    sql: `ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('ultra_admin','admin','super_admin','auditor','viewer','user') NOT NULL DEFAULT 'user'`
  },
  {
    name: 'ADD org_members.canTriggerAlerts',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canTriggerAlerts\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD org_members.canRunDrills',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canRunDrills\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD org_members.canExportReports',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canExportReports\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD org_members.canViewIncidentLogs',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canViewIncidentLogs\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD org_members.canSubmitAnonymousReports',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canSubmitAnonymousReports\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD org_members.canAccessEap',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canAccessEap\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD org_members.canManageSiteAssessments',
    sql: `ALTER TABLE \`org_members\` ADD COLUMN \`canManageSiteAssessments\` boolean DEFAULT false NOT NULL`
  },
  {
    name: 'ADD users.impersonatingUserId',
    sql: `ALTER TABLE \`users\` ADD COLUMN \`impersonatingUserId\` int`
  }
];

for (const { name, sql } of statements) {
  try {
    await conn.execute(sql);
    console.log(`✓ ${name}`);
  } catch (err) {
    if (
      err.code === 'ER_DUP_FIELDNAME' ||
      err.code === 'ER_TABLE_EXISTS_ERROR' ||
      (err.message && err.message.includes('Duplicate column'))
    ) {
      console.log(`⊘ SKIP (already exists): ${name}`);
    } else {
      console.error(`✗ ERROR: ${name} — ${err.message}`);
    }
  }
}

await conn.end();
console.log('\nMigration complete.');
