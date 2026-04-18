require('dotenv').config();
const pool = require('./db');

async function fixApiKeysTable() {
  console.log('🔧 Fixing api_keys table schema...\n');

  const migrations = [
    // Drop old api_keys table and rebuild with correct schema
    `CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL DEFAULT 'Default Key',
      key VARCHAR(80) UNIQUE NOT NULL,
      secret VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used TIMESTAMP,
      monthly_requests INTEGER DEFAULT 0,
      rotated_at TIMESTAMP,
      revoked_at TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)`,
    // Add columns if they don't exist (safe migrations)
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Default Key'`,
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key VARCHAR(80)`,
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS secret VARCHAR(255)`,
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS monthly_requests INTEGER DEFAULT 0`,
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMP`,
    `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP`,
    // Fix audit_logs table
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      admin_id INTEGER REFERENCES users(id),
      action VARCHAR(255),
      target_user_id INTEGER REFERENCES users(id),
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id INTEGER`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT`,
    // Ensure users have plan column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)`,
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
      const preview = sql.trim().substring(0, 70).replace(/\n/g, ' ');
      console.log('✅', preview + '...');
    } catch (e) {
      if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
        console.log('⚠️  Warning:', e.message.substring(0, 80));
      }
    }
  }

  console.log('\n✅ Schema migration complete!');

  // Show current schema
  const cols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'api_keys' ORDER BY ordinal_position"
  );
  console.log('\n📋 api_keys columns:', cols.rows.map(r => r.column_name).join(', '));

  const userCols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log('📋 users columns:', userCols.rows.map(r => r.column_name).join(', '));

  await pool.end();
}

fixApiKeysTable().catch(e => { console.error('Fatal:', e.message); pool.end(); });
