const mysql = require('mysql2/promise');

async function updateIncidentReports() {
  // Use the same connection details as sync-db-compatible.js
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway04.us-east-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'FT92UrPpRty6woU.root',
    password: process.env.DB_PASSWORD || 'your_password_here',
    database: process.env.DB_NAME || '6DTQVcKYnmAua9uKjjRgPe',
    ssl: { rejectUnauthorized: true }
  });

  try {
    // Update incident_reports where orgId is null, setting it from facilities.orgId
    const [result] = await connection.execute(`
      UPDATE incident_reports ir
      JOIN facilities f ON ir.facilityId = f.id
      SET ir.orgId = f.orgId
      WHERE ir.orgId IS NULL AND f.orgId IS NOT NULL
    `);

    console.log(`Updated ${result.affectedRows} incident reports with orgId from facilities`);
  } catch (error) {
    console.error('Error updating incident reports:', error);
  } finally {
    await connection.end();
  }
}

updateIncidentReports();