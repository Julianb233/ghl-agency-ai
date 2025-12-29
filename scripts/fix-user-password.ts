import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

async function fixUserPassword() {
  const sql = neon(process.env.DATABASE_URL!);

  const newPassword = 'Test1234';
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  console.log('Fixing password for julian@aiacrobatics.com...');
  console.log('New password:', newPassword);
  console.log('Hash:', hashedPassword.substring(0, 20) + '...');

  try {
    // Check current database columns
    const columns = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
    `;
    console.log('\nDatabase columns:', columns.map(c => c.column_name).join(', '));

    // Check if user exists (look for both id formats)
    let user = await sql`SELECT * FROM users WHERE email = 'julian@aiacrobatics.com'`;

    if (user.length === 0) {
      console.log('\nUser not found. Creating new user...');

      // Check if 'password' column exists
      const hasPasswordCol = columns.some(c => c.column_name === 'password');
      const hasPasswordHashCol = columns.some(c => c.column_name === 'password_hash');

      if (hasPasswordCol) {
        await sql`
          INSERT INTO users (email, password, name)
          VALUES ('julian@aiacrobatics.com', ${hashedPassword}, 'Julian')
        `;
        console.log('✅ User created with password column');
      } else if (hasPasswordHashCol) {
        await sql`
          INSERT INTO users (email, password_hash, name)
          VALUES ('julian@aiacrobatics.com', ${hashedPassword}, 'Julian')
        `;
        console.log('✅ User created with password_hash column');
      } else {
        console.log('❌ No password column found!');
      }
    } else {
      console.log('\nUser found:', { id: user[0].id, email: user[0].email });
      console.log('Current password field:', user[0].password ? 'SET' : 'NULL');
      console.log('Current password_hash field:', user[0].password_hash ? 'SET' : 'NULL');

      // Try updating both possible columns
      const hasPasswordCol = columns.some(c => c.column_name === 'password');
      const hasPasswordHashCol = columns.some(c => c.column_name === 'password_hash');

      if (hasPasswordCol) {
        await sql`
          UPDATE users SET password = ${hashedPassword}
          WHERE email = 'julian@aiacrobatics.com'
        `;
        console.log('✅ Updated password column');
      }

      if (hasPasswordHashCol) {
        await sql`
          UPDATE users SET password_hash = ${hashedPassword}
          WHERE email = 'julian@aiacrobatics.com'
        `;
        console.log('✅ Updated password_hash column');
      }
    }

    // Verify
    const verify = await sql`SELECT id, email, password, password_hash FROM users WHERE email = 'julian@aiacrobatics.com'`;
    console.log('\nVerification:', {
      id: verify[0]?.id,
      email: verify[0]?.email,
      password: verify[0]?.password ? 'SET' : 'NULL',
      password_hash: verify[0]?.password_hash ? 'SET' : 'NULL',
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserPassword();
