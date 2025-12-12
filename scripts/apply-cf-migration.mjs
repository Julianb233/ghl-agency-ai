#!/usr/bin/env node
// Apply Claude Flow migration to database
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

async function applyMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const migrationPath = path.join(__dirname, '../drizzle/0006_claude_flow_schemas.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying Claude Flow migration...');
    await client.query(sql);

    console.log('Migration applied successfully!');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'cf_%'
      ORDER BY table_name
    `);

    console.log(`\nCreated ${result.rows.length} Claude Flow tables:`);
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\nNote: Some tables may already exist. This is expected if migration was partially applied.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
