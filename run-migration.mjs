import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse the URL to extract components
const urlObj = new URL(url);
const host = urlObj.hostname;
const port = parseInt(urlObj.port) || 4000;
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
    name: 'CREATE staff_checkins',
    sql: `CREATE TABLE IF NOT EXISTS \`staff_checkins\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`orgId\` int,
      \`facilityId\` int,
      \`staffName\` varchar(255) NOT NULL,
      \`status\` enum('reunification','injured','off_site','cannot_disclose') NOT NULL,
      \`location\` text,
      \`recordedByUserId\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`staff_checkins_id\` PRIMARY KEY(\`id\`)
    )`
  },
  {
    name: 'ADD facilities.emergencyRoles',
    sql: `ALTER TABLE \`facilities\` ADD COLUMN \`emergencyRoles\` text`
  },
  {
    name: 'ADD facilities.aedOnSite',
    sql: `ALTER TABLE \`facilities\` ADD COLUMN \`aedOnSite\` boolean DEFAULT false`
  },
  {
    name: 'ADD facilities.aedLocations',
    sql: `ALTER TABLE \`facilities\` ADD COLUMN \`aedLocations\` text`
  },
  {
    name: 'ADD flagged_visitors.flagLevel',
    sql: `ALTER TABLE \`flagged_visitors\` ADD COLUMN \`flagLevel\` enum('red','yellow') DEFAULT 'red' NOT NULL`
  },
  {
    name: 'ADD push_subscriptions.endpoint',
    sql: `ALTER TABLE \`push_subscriptions\` ADD COLUMN \`endpoint\` varchar(512)`
  },
  {
    name: 'ADD users.rasRole',
    sql: `ALTER TABLE \`users\` ADD COLUMN \`rasRole\` enum('admin','responder','staff')`
  },
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
