require('dotenv').config();
const pool = require('./db');

async function checkAndFix() {
  // Check columns
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log('📋 Users table columns:', cols.rows.map(r => r.column_name).join(', '));

  // Check row count
  const count = await pool.query('SELECT COUNT(*) FROM users');
  console.log('👥 Total users:', count.rows[0].count);

  // Sample rows
  const sample = await pool.query('SELECT * FROM users LIMIT 3');
  if (sample.rows.length > 0) {
    console.log('\nSample row keys:', Object.keys(sample.rows[0]).join(', '));
    sample.rows.forEach(u => console.log(' -', JSON.stringify(u)));
  }

  await pool.end();
}

checkAndFix().catch(e => { console.error('Error:', e.message); pool.end(); });
