import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BDuynUv93aHd@ep-frosty-butterfly-ahz6v6bh-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');

    // Check if onboardingCompleted column exists on users table
    const checkOnboardingCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'onboardingCompleted'
    `);

    if (checkOnboardingCol.rows.length === 0) {
      console.log('Adding onboardingCompleted column to users table...');
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('✓ onboardingCompleted column added');
    } else {
      console.log('✓ onboardingCompleted column already exists');
    }

    // Check if user_profiles table exists
    const checkProfilesTable = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'user_profiles'
    `);

    if (checkProfilesTable.rows.length === 0) {
      console.log('Creating user_profiles table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "user_profiles" (
          "id" SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL UNIQUE REFERENCES "users"("id"),
          "companyName" TEXT,
          "industry" VARCHAR(100),
          "monthlyRevenue" VARCHAR(50),
          "employeeCount" VARCHAR(50),
          "website" TEXT,
          "phone" VARCHAR(30),
          "goals" JSONB,
          "currentTools" JSONB,
          "referralSource" VARCHAR(100),
          "ghlApiKey" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✓ user_profiles table created');
    } else {
      console.log('✓ user_profiles table already exists');
    }

    console.log('\nMigration complete!');

    // Show current schema
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\nUsers table columns:');
    cols.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type} (${r.is_nullable === 'YES' ? 'nullable' : 'not null'})`));

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
