import { neon } from '@neondatabase/serverless';

async function checkSchema() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('Checking users table schema...\n');

  const columns = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `;

  console.log('Users table columns:');
  columns.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
}

checkSchema();
