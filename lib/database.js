const pool = require('../db');

// Initialize database tables if they don't exist
const initializeDatabaseTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        business_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending_approval',
        plan VARCHAR(20) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP
      );
    `);

    // API Keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        api_key VARCHAR(50) UNIQUE NOT NULL,
        api_secret VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        revoked_at TIMESTAMP
      );
    `);

    // Usage statistics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        request_count INTEGER DEFAULT 0,
        successful_requests INTEGER DEFAULT 0,
        total_response_time INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id),
        action VARCHAR(255),
        target_user_id INTEGER REFERENCES users(id),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.error('Database initialization error:', err);
    }
  }
};

// Get all users with pagination
const getAllUsers = async (filterBy = {}, page = 1, limit = 20) => {
  try {
    let query = 'SELECT id, email, name, business_name, status, plan, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filterBy.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filterBy.status);
      paramIndex++;
    }

    if (filterBy.plan) {
      query += ` AND plan = $${paramIndex}`;
      params.push(filterBy.plan);
      paramIndex++;
    }

    if (filterBy.email) {
      query += ` AND email ILIKE $${paramIndex}`;
      params.push(`%${filterBy.email}%`);
      paramIndex++;
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (filterBy.status) {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(filterBy.status);
      countIndex++;
    }

    if (filterBy.plan) {
      countQuery += ` AND plan = $${countIndex}`;
      countParams.push(filterBy.plan);
      countIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    throw new Error('Failed to retrieve users: ' + err.message);
  }
};

// Update user status (approve/suspend/activate)
const updateUserStatus = async (userId, newStatus, adminId, reason = '') => {
  try {
    await pool.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newStatus, userId]);

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [adminId, `User status changed to ${newStatus}`, userId, JSON.stringify({ reason })]
    );

    return { success: true, message: `User status updated to ${newStatus}` };
  } catch (err) {
    throw new Error('Failed to update user status: ' + err.message);
  }
};

// Update user plan
const updateUserPlan = async (userId, newPlan, adminId) => {
  try {
    await pool.query('UPDATE users SET plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPlan, userId]);

    // Log action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [adminId, `User plan changed to ${newPlan}`, userId, JSON.stringify({})]
    );

    return { success: true, message: `User plan updated to ${newPlan}` };
  } catch (err) {
    throw new Error('Failed to update user plan: ' + err.message);
  }
};

// Get user by ID with all details
const getUserDetails = async (userId) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, name, business_name, status, plan, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Get API keys
    const keysResult = await pool.query(
      'SELECT id, name, LEFT(api_key, 10) as api_key_preview, created_at, last_used, status FROM api_keys WHERE user_id = $1',
      [userId]
    );

    // Get usage stats
    const statsResult = await pool.query(
      'SELECT * FROM usage_stats WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
      [userId]
    );

    return {
      ...user,
      apiKeys: keysResult.rows,
      usageStats: statsResult.rows
    };
  } catch (err) {
    throw new Error('Failed to retrieve user details: ' + err.message);
  }
};

module.exports = {
  initializeDatabaseTables,
  getAllUsers,
  updateUserStatus,
  updateUserPlan,
  getUserDetails
};
