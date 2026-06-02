const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.js <sql-file>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const content = fs.readFileSync(path.resolve(file), 'utf8');
const statements = content.split(';').map(s => s.trim()).filter(s => s.length > 0);

(async () => {
  await sql.query('BEGIN');
  try {
    for (const stmt of statements) {
      await sql.query(stmt);
      console.log('✓', stmt.substring(0, 80).replace(/\s+/g, ' ') + '...');
    }
    await sql.query('COMMIT');
    console.log('Migration complete.');
  } catch (e) {
    await sql.query('ROLLBACK');
    console.error('Migration failed, rolled back:', e);
    process.exit(1);
  }
})();
