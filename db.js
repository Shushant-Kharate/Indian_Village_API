const { Pool } = require('pg');
require('dotenv').config();

// Optimized connection pool for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                          // Max connections in pool
  idleTimeoutMillis: 30000,        // Close idle connections after 30s
  connectionTimeoutMillis: 10000,   // Connection timeout
  statement_timeout: 5000,          // Query timeout
  application_name: 'village-api'
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Connection retry logic
pool.on('connect', () => {
  console.log('✅ New database connection established');
});

module.exports = pool;
