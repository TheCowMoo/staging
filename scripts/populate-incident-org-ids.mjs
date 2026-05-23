import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  // Update incident_reports where orgId is null, setting it from facilities.orgId
  const [result] = await conn.execute(`
    UPDATE incident_reports ir
    JOIN facilities f ON ir.facilityId = f.id
    SET ir.orgId = f.orgId
    WHERE ir.orgId IS NULL AND f.orgId IS NOT NULL
  `);

  console.log(`✓ Updated ${result.affectedRows} incident reports with orgId from facilities`);
} catch (error) {
  console.error('Error updating incident reports:', error);
} finally {
  await conn.end();
}