import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`staff_checkins\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`orgId\` int,
    \`facilityId\` int,
    \`staffName\` varchar(255) NOT NULL,
    \`status\` enum('reunification','injured','off_site','cannot_disclose') NOT NULL,
    \`location\` text,
    \`recordedByUserId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`staff_checkins_id\` PRIMARY KEY(\`id\`)
  )`,
  `ALTER TABLE \`facilities\` ADD COLUMN IF NOT EXISTS \`emergencyRoles\` text`,
  `ALTER TABLE \`facilities\` ADD COLUMN IF NOT EXISTS \`aedOnSite\` boolean DEFAULT false`,
  `ALTER TABLE \`facilities\` ADD COLUMN IF NOT EXISTS \`aedLocations\` text`,
  `ALTER TABLE \`flagged_visitors\` ADD COLUMN IF NOT EXISTS \`flagLevel\` enum('red','yellow') DEFAULT 'red' NOT NULL`,
  `ALTER TABLE \`push_subscriptions\` ADD COLUMN IF NOT EXISTS \`endpoint\` varchar(512)`,
  `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`rasRole\` enum('admin','responder','staff')`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.substring(0, 60).trim());
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.message.includes('Duplicate column')) {
      console.log('SKIP (already exists):', sql.substring(0, 60).trim());
    } else {
      console.error('ERROR:', err.message, '\nSQL:', sql.substring(0, 80));
    }
  }
}

await conn.end();
console.log('Migration complete.');
