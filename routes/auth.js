/**
 * Authentication Routes
 * Handle user registration, login, and authentication middleware
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../lib/database');
const { notifyAdminOfNewRegistration } = require('../lib/emailService');
const { isUserApproved } = require('../lib/approvalWorkflow');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Middleware to verify JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Verify user still exists and is active
    const result = await pool.query(
      'SELECT id, email, businessName, plan, status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if user is approved (except for admins checking their own status)
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Account has been rejected' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to check admin role
 */
const verifyAdmin = async (req, res, next) => {
  try {
    // First verify token
    await new Promise((resolve, reject) => {
      verifyToken(req, res, () => resolve());
    });

    // Check if user is admin
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    res.status(403).json({ error: 'Admin access required' });
  }
};

/**
 * User Registration
 * POST /api/v1/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, businessName, gstNumber, address, phone } = req.body;

    // Validation
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const userId = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (
        id, email, password, businessName, gstNumber, address, phone, 
        plan, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, email, businessName, plan, status`,
      [userId, email, hashedPassword, businessName, gstNumber, address, phone, 'free', 'pending']
    );

    // Send admin notification
    notifyAdminOfNewRegistration(userId, businessName, email, gstNumber).catch(err =>
      console.error('Failed to notify admin:', err)
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Awaiting admin approval.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * User Login
 * POST /api/v1/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user
    const result = await pool.query(
      'SELECT id, email, businessName, password, plan, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check account status
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account is pending admin approval' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Account has been rejected' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Get user profile (requires authentication)
 * GET /api/v1/user/profile
 */
router.get('/user/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, businessName, plan, status, phone, address, gstNumber, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * List pending users (admin only)
 * GET /api/v1/admin/users?status=pending
 */
router.get('/admin/users', verifyAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT id, email, businessName, gstNumber, phone, address, status, created_at 
       FROM users WHERE status = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE status = $1',
      [status]
    );

    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: parseInt(countResult.rows[0].count),
        returned: result.rows.length,
        limit,
        offset
      }
    });
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Approve user (admin only)
 * POST /api/v1/admin/users/:userId/approve
 */
router.post('/admin/users/:userId/approve', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    // Import approval workflow
    const { approveUser } = require('../lib/approvalWorkflow');
    const result = await approveUser(userId, notes);

    res.json({
      success: true,
      message: 'User approved',
      data: result
    });
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

/**
 * Reject user (admin only)
 * POST /api/v1/admin/users/:userId/reject
 */
router.post('/admin/users/:userId/reject', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Import approval workflow
    const { rejectUser } = require('../lib/approvalWorkflow');
    const result = await rejectUser(userId, reason);

    res.json({
      success: true,
      message: 'User rejected',
      data: result
    });
  } catch (err) {
    console.error('Rejection error:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

module.exports = {
  authRoutes: router,
  verifyToken,
  verifyAdmin,
  JWT_SECRET
};
