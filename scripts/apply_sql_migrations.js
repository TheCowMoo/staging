#!/usr/bin/env node
/*
  Simple SQL migration runner — applies .sql files from the drizzle/ folder
  and records applied filenames + checksum in `applied_migrations` table.

  Usage:
    DATABASE_URL=mysql://user:pass@host:3306/db node scripts/apply_sql_migrations.js
  or set DB_HOST/DB_USER/DB_PASS/DB_NAME/DB_PORT env vars.
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function getConfigFromEnv() {
  const url = process.env.DATABASE_URL;
  if (url) {
    // let mysql2 accept the connection string directly later; parse for safety
    try {
      const u = new URL(url);
      return {
        host: u.hostname,
        port: u.port ? parseInt(u.port, 10) : 3306,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, ''),
      };
    } catch (err) {
      console.error('Invalid DATABASE_URL:', err.message);
      process.exit(1);
    }
  }
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASS || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DB || process.env.DATABASE_NAME || 'test',
  };
}

function checksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function main() {
  const cfg = await getConfigFromEnv();
  console.log('Connecting to MySQL at %s:%d database=%s', cfg.host, cfg.port, cfg.database);
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: true,
  });

  // ensure applied_migrations table exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS applied_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(512) NOT NULL UNIQUE,
      checksum VARCHAR(128) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const migrationsDir = path.resolve(__dirname, '..', 'drizzle');
  if (!fs.existsSync(migrationsDir)) {
    console.error('drizzle/ directory not found at', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.toLowerCase().endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql files found in drizzle/. Nothing to apply.');
    await conn.end();
    return;
  }

  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const content = fs.readFileSync(full, 'utf8').trim();
    if (!content) {
      console.log('Skipping empty file', file);
      continue;
    }
    const ch = checksum(content);

    const [rows] = await conn.query('SELECT checksum FROM applied_migrations WHERE filename = ?', [file]);
    if (rows.length > 0) {
      const existing = rows[0].checksum;
      if (existing === ch) {
        console.log('Already applied:', file);
        continue;
      } else {
        console.warn('Filename already applied with different checksum:', file);
        console.warn(' - Existing checksum:', existing);
        console.warn(' - Current checksum :', ch);
        console.warn('Skipping to avoid accidental re-run. Rename file or review changes.');
        continue;
      }
    }

    console.log('Applying migration:', file);
    try {
      // Execute the full SQL file; multipleStatements enabled on connection
      await conn.query(content);
      await conn.query('INSERT INTO applied_migrations (filename, checksum) VALUES (?, ?)', [file, ch]);
      console.log('Applied:', file);
    } catch (err) {
      console.error('Failed to apply', file, err && err.message ? err.message : err);
      console.error('Stopping further migrations. You can fix the SQL and re-run.');
      await conn.end();
      process.exit(1);
    }
  }

  console.log('Migrations complete.');
  await conn.end();
}

main().catch(err => {
  console.error('Migration runner error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
