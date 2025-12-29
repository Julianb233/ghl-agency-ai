import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

async function updatePassword() {
  const sql = neon(process.env.DATABASE_URL!);

  // Hash the new password (8+ characters)
  const newPassword = 'Test1234';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log('Updating password for julian@aiacrobatics.com...');
  console.log('New password:', newPassword);

  try {
    // Check if user exists
    const users = await sql`SELECT id, email, name FROM users WHERE email = 'julian@aiacrobatics.com'`;

    if (users.length === 0) {
      console.log('User not found. Creating new user...');

      await sql`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ('julian@aiacrobatics.com', ${hashedPassword}, 'Julian', 'admin')
      `;
      console.log('✅ User created with password:', newPassword);
    } else {
      console.log('User found:', users[0]);

      // Update password
      await sql`
        UPDATE users
        SET password_hash = ${hashedPassword}
        WHERE email = 'julian@aiacrobatics.com'
      `;
      console.log('✅ Password updated to:', newPassword);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

updatePassword();
