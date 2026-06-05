#!/usr/bin/env node
/**
 * Apply all pending Drizzle migrations.
 * Run this on the VPS: node scripts/apply-all-migrations.cjs
 */
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL || "mysql://root:password@127.0.0.1:3306/safeguard";
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
if (!match) {
  console.error("ERROR: Could not parse DATABASE_URL:", dbUrl);
  process.exit(1);
}

const [, user, password, host, portStr, database] = match;
const port = parseInt(portStr || "3306");

async function main() {
  console.log("Connecting to MySQL...");
  const conn = await mysql.createConnection({ host, user, password, database, port });

  // Run all migration files in order
  const migrationsDir = path.resolve(__dirname, "../drizzle");
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql") && /^\d{4}/.test(f))
    .sort();

  console.log("Found " + files.length + " migration files");

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf8");
    
    try {
      await conn.execute(sql);
      console.log("  [OK] " + file);
    } catch (err) {
      console.error("  [ERR] " + file + ": " + err.message);
    }
  }

  // Verify tables exist
  const [tables] = await conn.execute("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  console.log("\nTables in database:");
  for (const name of ["training_modules", "notifications"]) {
    const found = tableNames.find(t => t === name);
    console.log("  " + name + ": " + (found ? "EXISTS" : "MISSING"));
  }

  await conn.end();
  console.log("\nDone!");
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});