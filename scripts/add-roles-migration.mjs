import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log("Running roles and permissions migration...");
    
    // 1. Update platform roles in users table
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('ultra_admin', 'admin', 'super_admin', 'auditor', 'viewer', 'user') NOT NULL DEFAULT 'user'
    `);
    console.log("Updated users.role enum");

    // 2. Update org roles in org_members table
    await connection.execute(`
      ALTER TABLE org_members 
      MODIFY COLUMN role ENUM('super_admin', 'admin', 'auditor', 'user', 'viewer') NOT NULL DEFAULT 'user'
    `);
    console.log("Updated org_members.role enum");

    // 3. Update org roles in org_invites table
    await connection.execute(`
      ALTER TABLE org_invites 
      MODIFY COLUMN role ENUM('super_admin', 'admin', 'auditor', 'user', 'viewer') NOT NULL DEFAULT 'user'
    `);
    console.log("Updated org_invites.role enum");

    // 4. Add optional permission flags to org_members
    await connection.execute(`
      ALTER TABLE org_members 
      ADD COLUMN canTriggerAlerts BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN canRunDrills BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN canExportReports BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN canViewIncidentLogs BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN canSubmitAnonymousReports BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN canAccessEap BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN canManageSiteAssessments BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("Added permission flags to org_members");

    // 5. Add impersonation support to users table
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN impersonatingUserId INT DEFAULT NULL
    `);
    console.log("Added impersonatingUserId to users");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

run();
