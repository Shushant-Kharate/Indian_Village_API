const express = require('express');
const pool = require('../db');
const { getAllUsers, updateUserStatus, updateUserPlan, getUserDetails } = require('../lib/database');

const router = express.Router();

// Middleware: Verify admin
const verifyAdmin = async (req, res, next) => {
  // In production, check if user has admin role
  if (!req.userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  // For now, allow all authenticated users to be admins (in production, check database)
  next();
};

// Dashboard stats
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    // Total villages
    const villageStats = await pool.query('SELECT COUNT(*) as total FROM villages');
    const villages = parseInt(villageStats.rows[0].total);

    // Total states
    const stateStats = await pool.query('SELECT COUNT(*) as total FROM states');
    const states = parseInt(stateStats.rows[0].total);

    // Total districts
    const districtStats = await pool.query('SELECT COUNT(*) as total FROM districts');
    const districts = parseInt(districtStats.rows[0].total);

    // Total users
    const userStats = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM users");
    const totalUsers = parseInt(userStats.rows[0].total);
    const activeUsers = parseInt(userStats.rows[0].active);

    // API requests today
    const logsResult = await pool.query(
      `SELECT COUNT(*) as count, AVG(response_time) as avg_response_time 
       FROM api_logs 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const requestsToday = parseInt(logsResult.rows[0]?.count || 0);
    const avgResponseTime = Math.round(logsResult.rows[0]?.avg_response_time || 0);

    // Revenue (placeholder)
    const revenueResult = await pool.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE plan IN ('premium', 'pro', 'unlimited')`
    );
    const premiumUsers = parseInt(revenueResult.rows[0]?.count || 0);

    res.json({
      success: true,
      data: {
        villages,
        states,
        districts,
        totalUsers,
        activeUsers,
        requestsToday,
        avgResponseTime,
        estimatedMRR: (premiumUsers * 50) + ' USD' // Rough estimate
      },
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status, plan, email } = req.query;

    const result = await getAllUsers({ status, plan, email }, page, limit);

    res.json({
      success: true,
      count: result.users.length,
      data: result.users,
      pagination: result.pagination,
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

// Get user details
router.get('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await getUserDetails(parseInt(req.params.userId));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
        meta: { requestId: req.requestId }
      });
    }

    res.json({
      success: true,
      data: user,
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

// Update user status (approve/suspend/activate)
router.patch('/users/:userId/status', verifyAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'pending_approval'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
        code: 'INVALID_REQUEST',
        meta: { requestId: req.requestId }
      });
    }

    const result = await updateUserStatus(
      parseInt(req.params.userId),
      status,
      req.userId,
      reason
    );

    res.json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

// Update user plan
router.patch('/users/:userId/plan', verifyAdmin, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['free', 'premium', 'pro', 'unlimited'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan value',
        code: 'INVALID_REQUEST',
        meta: { requestId: req.requestId }
      });
    }

    const result = await updateUserPlan(parseInt(req.params.userId), plan, req.userId);

    res.json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

// Village browser
router.get('/villages', verifyAdmin, async (req, res) => {
  try {
    const { state, district, subdistrict, search, page = 1, limit = 500 } = req.query;

    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'State parameter required',
        code: 'MISSING_PARAMETER',
        meta: { requestId: req.requestId }
      });
    }

    let query = `
      SELECT v.village_code, v.village_name, sd.subdistrict_name, d.district_name, s.state_name
      FROM villages v
      JOIN subdistricts sd ON v.subdistrict_code = sd.subdistrict_code
      JOIN districts d ON sd.district_code = d.district_code
      JOIN states s ON d.state_code = s.state_code
      WHERE s.state_code = $1
    `;
    const params = [state];
    let paramIndex = 2;

    if (district) {
      query += ` AND d.district_code = $${paramIndex}`;
      params.push(district);
      paramIndex++;
    }

    if (subdistrict) {
      query += ` AND sd.subdistrict_code = $${paramIndex}`;
      params.push(subdistrict);
      paramIndex++;
    }

    if (search) {
      query += ` AND v.village_name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY v.village_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

// API logs
router.get('/logs', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, apiKey, endpoint, statusCode, page = 1, limit = 100 } = req.query;

    let query = 'SELECT * FROM api_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }

    if (apiKey) {
      query += ` AND api_key LIKE $${paramIndex}`;
      params.push(apiKey + '%');
      paramIndex++;
    }

    if (endpoint) {
      query += ` AND endpoint LIKE $${paramIndex}`;
      params.push(endpoint + '%');
      paramIndex++;
    }

    if (statusCode) {
      query += ` AND status_code = $${paramIndex}`;
      params.push(parseInt(statusCode));
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      meta: {
        requestId: req.requestId,
        responseTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'INTERNAL_ERROR',
      meta: { requestId: req.requestId }
    });
  }
});

module.exports = router;
