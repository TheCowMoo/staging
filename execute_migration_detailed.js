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

  console.log('='.repeat(80));
  console.log('DATABASE MIGRATION EXECUTION REPORT');
  console.log('='.repeat(80));
  console.log(`Database: safeguard`);
  console.log(`Total Statements: ${statements.length}`);
  console.log('='.repeat(80) + '\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await connection.execute(stmt);
      successCount++;
      console.log(`[${i + 1}/${statements.length}] ✓ SUCCESS`);
      console.log(`    Statement: ${stmt}`);
    } catch (error) {
      errorCount++;
      console.log(`[${i + 1}/${statements.length}] ✗ ERROR`);
      console.log(`    Statement: ${stmt}`);
      console.log(`    Error Message: ${error.message}`);
    }
    console.log();
  }

  await connection.end();
  console.log('='.repeat(80));
  console.log(`SUMMARY: ${successCount} Successful, ${errorCount} Errors`);
  console.log('='.repeat(80));
}

executeStatements().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
