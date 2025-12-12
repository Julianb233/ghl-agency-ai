import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Reading migration file...');
    const migrationSQL = readFileSync(
      join(__dirname, '..', 'drizzle', '0003_fair_grey_gargoyle.sql'),
      'utf-8'
    );

    console.log('Applying migration...');
    await client.query(migrationSQL);

    console.log('✓ Migration applied successfully!');

    // Verify tables exist
    console.log('\nVerifying agent tables...');
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'agent_sessions',
        'agent_executions',
        'generated_projects',
        'knowledge_entries',
        'tool_executions'
      )
      ORDER BY table_name;
    `);

    console.log('Agent tables found:');
    tableCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    if (tableCheck.rows.length === 5) {
      console.log('\n✓ All 5 agent tables created successfully!');
    } else {
      console.log(`\n⚠ Only ${tableCheck.rows.length}/5 agent tables found`);
    }

    client.release();
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration().catch(console.error);
