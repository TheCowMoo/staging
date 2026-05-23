/**
 * Migration runner for 0029 and 0030
 * Usage: DATABASE_URL="mysql://user:pass@host:port/db" node run_migrations_0029_0030.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌  DATABASE_URL is not set.');
  console.error('    Usage: DATABASE_URL="mysql://..." node run_migrations_0029_0030.mjs');
  process.exit(1);
}

const urlObj = new URL(url);
const host     = urlObj.hostname;
const port     = parseInt(urlObj.port) || 4000;
const user     = decodeURIComponent(urlObj.username);
const password = decodeURIComponent(urlObj.password);
const database = urlObj.pathname.slice(1).split('?')[0];

console.log(`\nConnecting to ${host}:${port}/${database} as ${user} …`);

const conn = await mysql.createConnection({
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true },
  connectTimeout: 30000,
});
console.log('✅  Connected!\n');

const migrations = [
  // ── 0029: Roles, permission flags, impersonation ──────────────────────────
  {
    name: '0029 — Expand org_invites.inviteRole enum',
    sql: `ALTER TABLE \`org_invites\` MODIFY COLUMN \`inviteRole\` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'`,
  },
  {
    name: '0029 — Expand org_members.orgRole enum',
    sql: `ALTER TABLE \`org_members\` MODIFY COLUMN \`orgRole\` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'`,
  },
  {
    name: '0029 — Expand users.role enum (add ultra_admin, super_admin)',
    sql: `ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('ultra_admin','admin','super_admin','auditor','viewer','user') NOT NULL DEFAULT 'user'`,
  },
  {
    name: '0029 — Add org_members.canTriggerAlerts',
    sql: `ALTER TABLE \`org_members\` ADD \`canTriggerAlerts\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add org_members.canRunDrills',
    sql: `ALTER TABLE \`org_members\` ADD \`canRunDrills\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add org_members.canExportReports',
    sql: `ALTER TABLE \`org_members\` ADD \`canExportReports\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add org_members.canViewIncidentLogs',
    sql: `ALTER TABLE \`org_members\` ADD \`canViewIncidentLogs\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add org_members.canSubmitAnonymousReports',
    sql: `ALTER TABLE \`org_members\` ADD \`canSubmitAnonymousReports\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add org_members.canAccessEap',
    sql: `ALTER TABLE \`org_members\` ADD \`canAccessEap\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add org_members.canManageSiteAssessments',
    sql: `ALTER TABLE \`org_members\` ADD \`canManageSiteAssessments\` boolean DEFAULT false NOT NULL`,
  },
  {
    name: '0029 — Add users.impersonatingUserId',
    sql: `ALTER TABLE \`users\` ADD \`impersonatingUserId\` int`,
  },
  // ── 0030: Walkthrough flag ────────────────────────────────────────────────
  {
    name: '0030 — Add users.hasSeenWalkthrough',
    sql: `ALTER TABLE \`users\` ADD \`hasSeenWalkthrough\` boolean DEFAULT false NOT NULL`,
  },
];

let passed = 0;
let skipped = 0;
let failed = 0;

for (const { name, sql } of migrations) {
  try {
    await conn.execute(sql);
    console.log(`✅  ${name}`);
    passed++;
  } catch (err) {
    const isAlreadyExists =
      err.code === 'ER_DUP_FIELDNAME' ||
      err.code === 'ER_TABLE_EXISTS_ERROR' ||
      (err.message && err.message.toLowerCase().includes('duplicate column'));
    if (isAlreadyExists) {
      console.log(`⊘   SKIP (already exists): ${name}`);
      skipped++;
    } else {
      console.error(`❌  FAILED: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }
}

await conn.end();

console.log(`\n─────────────────────────────────────────`);
console.log(`Migration complete: ${passed} applied, ${skipped} skipped, ${failed} failed`);
if (failed > 0) {
  console.log('⚠️   Some migrations failed — review errors above.');
  process.exit(1);
} else {
  console.log('🎉  All migrations applied successfully!');
}
