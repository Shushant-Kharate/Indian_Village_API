require('dotenv').config();
const pool = require('./db');

async function migrateAndActivate() {
  console.log('🔧 Running migration...\n');

  // Add missing columns if they don't exist
  const migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
      console.log('✅', sql.substring(0, 60) + '...');
    } catch (e) {
      console.log('⚠️  Skipped:', e.message.substring(0, 60));
    }
  }

  // Set all users to active
  const update = await pool.query("UPDATE users SET status = 'active' WHERE status IS NULL OR status = 'pending_approval'");
  console.log(`\n✅ Activated ${update.rowCount} users`);

  // Show all users
  const result = await pool.query(
    'SELECT id, email, name, status, plan, created_at FROM users ORDER BY created_at DESC'
  );
  console.log(`\n📋 All ${result.rows.length} users in database:`);
  result.rows.forEach(u =>
    console.log(` [${u.id}] ${u.name || 'N/A'} | ${u.email} | ${u.status} | ${u.plan}`)
  );

  await pool.end();
}

migrateAndActivate().catch(e => { console.error('Fatal:', e.message); pool.end(); });
