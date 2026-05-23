import mysql from 'mysql2/promise';

const statements = [
  "ALTER TABLE `org_invites` MODIFY COLUMN `inviteRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'",
  "ALTER TABLE `org_members` MODIFY COLUMN `orgRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'",
  "ALTER TABLE `users` MODIFY COLUMN `role` enum('ultra_admin','admin','super_admin','auditor','viewer','user') NOT NULL DEFAULT 'user'",
  "ALTER TABLE `org_members` ADD `canTriggerAlerts` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `org_members` ADD `canRunDrills` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `org_members` ADD `canExportReports` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `org_members` ADD `canViewIncidentLogs` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `org_members` ADD `canSubmitAnonymousReports` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `org_members` ADD `canAccessEap` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `org_members` ADD `canManageSiteAssessments` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `users` ADD `impersonatingUserId` int"
];

async function executeStatements() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Marketingcow1!',
    database: 'safeguard',
    port: 3306
  });

  console.log('Connected to safeguard database');
  console.log('Executing', statements.length, 'SQL statements...\n');

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await connection.execute(stmt);
      console.log(`✓ Statement ${i + 1} SUCCESS: ${stmt.substring(0, 80)}...`);
    } catch (error) {
      console.log(`✗ Statement ${i + 1} ERROR: ${stmt.substring(0, 80)}...`);
      console.log(`  Error: ${error.message}\n`);
    }
  }

  await connection.end();
  console.log('\nMigration execution completed.');
}

executeStatements().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
