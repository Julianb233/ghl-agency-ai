import { neon } from '@neondatabase/serverless';

async function addPasswordColumn() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('Adding password column to users table...\n');

  try {
    // Add password column
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password text
    `;
    console.log('✅ Added password column');

    // Copy password_hash to password
    await sql`
      UPDATE users
      SET password = password_hash
      WHERE password_hash IS NOT NULL AND password IS NULL
    `;
    console.log('✅ Copied password_hash values to password column');

    // Verify
    const user = await sql`SELECT email, password, password_hash FROM users WHERE email = 'julian@aiacrobatics.com'`;
    console.log('\nVerification:', {
      email: user[0]?.email,
      password: user[0]?.password ? 'SET (' + user[0].password.substring(0, 10) + '...)' : 'NULL',
      password_hash: user[0]?.password_hash ? 'SET (' + user[0].password_hash.substring(0, 10) + '...)' : 'NULL',
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

addPasswordColumn();
