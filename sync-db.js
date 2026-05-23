#!/usr/bin/env node

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the database_sync.sql file
const sqlFile = path.join(__dirname, 'database_sync.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

// Split into individual statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

async function syncDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Marketingcow1!',
    database: process.env.DB_NAME || 'safeguard'
  });

  let success = 0;
  let failed = 0;
  const errors = [];

  console.log(`\n📊 Starting database sync with ${statements.length} statements...\n`);

  for (const statement of statements) {
    try {
      await connection.execute(statement);
      success++;
      console.log(`✓ ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
    } catch (error) {
      failed++;
      errors.push({ statement: statement.substring(0, 80), error: error.message });
      console.log(`✗ ${statement.substring(0, 80)} → ${error.message.substring(0, 50)}`);
    }
  }

  await connection.end();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✓ Sync Complete: ${success} successful, ${failed} failed`);
  console.log(`${'='.repeat(80)}\n`);

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  - ${e.statement}: ${e.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

syncDatabase().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
