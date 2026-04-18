require('dotenv').config();
const pool = require('./db');

async function activateUsers() {
  const update = await pool.query("UPDATE users SET status = 'active' WHERE status = 'pending_approval'");
  console.log('✅ Activated users:', update.rowCount);

  const result = await pool.query("SELECT id, email, name, status, plan, created_at FROM users ORDER BY created_at DESC LIMIT 25");
  console.log('\n📋 All users in database:');
  result.rows.forEach(u => console.log(` - [${u.id}] ${u.name} | ${u.email} | status: ${u.status} | plan: ${u.plan}`));
  console.log('\nTotal:', result.rows.length, 'users');
  await pool.end();
}

activateUsers().catch(e => { console.error(e.message); pool.end(); });
