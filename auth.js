const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '7d';

// Register user
const register = async (email, password, name) => {
  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Login user
const login = async (email, password) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    return { token, userId: user.id, email: user.email, name: user.name };
  } catch (err) {
    throw err;
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};

// Generate API key
const generateApiKey = async (userId) => {
  try {
    const apiKey = `sk_${uuidv4()}`;
    const result = await pool.query(
      'INSERT INTO api_keys (user_id, api_key) VALUES ($1, $2) RETURNING id, api_key, created_at',
      [userId, apiKey]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Verify API key (using new schema)
const verifyApiKey = async (apiKey, apiSecret = null) => {
  try {
    // Check both old and new schema columns just in case
    const result = await pool.query(
      "SELECT user_id, secret, status FROM api_keys WHERE (key = $1 OR api_key = $1) AND (status = 'active' OR revoked = false)",
      [apiKey]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or inactive API key');
    }
    
    // Update last_used
    pool.query("UPDATE api_keys SET last_used = NOW() WHERE key = $1 OR api_key = $1", [apiKey]).catch(e => console.error(e));

    return result.rows[0].user_id;
  } catch (err) {
    throw err;
  }
};

// Get user's API keys
const getUserApiKeys = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id, name, key, api_key, created_at, last_used, status, revoked FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Revoke API key
const revokeApiKey = async (userId, apiKeyId) => {
  try {
    const result = await pool.query(
      "UPDATE api_keys SET status = 'revoked', revoked = true, revoked_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id",
      [apiKeyId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    
    // Check for API key in header first
    if (apiKeyHeader) {
      try {
        const userId = await verifyApiKey(apiKeyHeader, req.headers['x-api-secret']);
        req.userId = userId;
        req.authType = 'api_key';
        
        // Fetch user plan for rate limiting
        const userPlanResult = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
        req.userPlan = userPlanResult.rows[0]?.plan || 'free';
        
        return next();
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API Key',
          code: 'INVALID_API_KEY',
          meta: {
            responseTime: new Date().toISOString(),
            requestId: req.requestId || `req_${Math.random().toString(36).substr(2, 9)}`
          }
        });
      }
    }

    // Check for Bearer token (JWT)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = verifyToken(token);
        req.userId = decoded.userId;
        req.authType = 'jwt';
        
        // Fetch user object
        const userResult = await pool.query('SELECT id, email, plan, status FROM users WHERE id = $1 AND status = $2', [decoded.userId, 'active']);
        if (userResult.rows.length === 0) {
          throw new Error('User account is inactive or not found');
        }
        req.user = userResult.rows[0];
        req.userPlan = req.user.plan;
        
        return next();
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: err.message,
          meta: {
            responseTime: new Date().toISOString(),
            requestId: req.requestId || `req_${Math.random().toString(36).substr(2, 9)}`
          }
        });
      }
    }

    // No valid auth found
    return res.status(401).json({
      success: false,
      error: 'Authentication required (Bearer token or X-API-Key)',
      meta: {
        responseTime: new Date().toISOString(),
        requestId: req.requestId || `req_${Math.random().toString(36).substr(2, 9)}`
      }
    });

  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      meta: {
        responseTime: new Date().toISOString(),
        requestId: req.requestId || `req_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  generateApiKey,
  verifyApiKey,
  getUserApiKeys,
  revokeApiKey,
  authMiddleware
};
