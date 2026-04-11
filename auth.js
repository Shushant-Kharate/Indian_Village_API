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

// Verify API key
const verifyApiKey = async (apiKey) => {
  try {
    const result = await pool.query(
      'SELECT user_id FROM api_keys WHERE api_key = $1 AND revoked = false',
      [apiKey]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid API key');
    }

    return result.rows[0].user_id;
  } catch (err) {
    throw err;
  }
};

// Get user's API keys
const getUserApiKeys = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id, api_key, created_at, last_used, revoked FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
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
      'UPDATE api_keys SET revoked = true WHERE id = $1 AND user_id = $2 RETURNING id',
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
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
        meta: {
          responseTime: new Date().toISOString(),
          requestId: `req_${Math.random().toString(36).substr(2, 9)}`
        }
      });
    }

    // Check for Bearer token (JWT)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = verifyToken(token);
        req.userId = decoded.userId;
        req.authType = 'jwt';
        next();
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: err.message,
          meta: {
            responseTime: new Date().toISOString(),
            requestId: `req_${Math.random().toString(36).substr(2, 9)}`
          }
        });
      }
    }
    // Check for API key
    else {
      try {
        const userId = await verifyApiKey(authHeader);
        req.userId = userId;
        req.authType = 'api_key';
        next();
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: err.message,
          meta: {
            responseTime: new Date().toISOString(),
            requestId: `req_${Math.random().toString(36).substr(2, 9)}`
          }
        });
      }
    }
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      meta: {
        responseTime: new Date().toISOString(),
        requestId: `req_${Math.random().toString(36).substr(2, 9)}`
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
