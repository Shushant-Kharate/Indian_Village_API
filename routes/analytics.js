// Analytics endpoints for admin dashboard
const express = require('express');
const pool = require('../db');
const router = express.Router();

// Helper: Standard response
const sendResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - res.req?.startTime || 0
    }
  });
};

const sendError = (res, message, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    meta: { timestamp: new Date().toISOString() }
  });
};

// 1. GET /admin/analytics/overview - Main dashboard cards
router.get('/overview', async (req, res) => {
  try {
    // Total villages
    const villages = await pool.query('SELECT COUNT(*) as count FROM villages');
    
    // Active users (logged in last 7 days)
    const activeUsers = await pool.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE updated_at > NOW() - INTERVAL '7 days' AND status = 'active'`
    );
    
    // Today's requests
    const todayRequests = await pool.query(
      `SELECT COUNT(*) as count FROM api_logs 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    
    // Average response time (last 24 hours)
    const avgResponseTime = await pool.query(
      `SELECT AVG(response_time) as avg FROM api_logs 
       WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    
    // Yesterday's requests for comparison
    const yesterdayRequests = await pool.query(
      `SELECT COUNT(*) as count FROM api_logs 
       WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'`
    );
    
    const today = parseInt(todayRequests.rows[0]?.count || 0);
    const yesterday = parseInt(yesterdayRequests.rows[0]?.count || 0);
    const percentChange = yesterday > 0 ? ((today - yesterday) / yesterday * 100).toFixed(1) : 0;

    sendResponse(res, {
      totalVillages: parseInt(villages.rows[0]?.count || 0),
      activeUsers: parseInt(activeUsers.rows[0]?.count || 0),
      todayRequests: today,
      yesterdayRequests: yesterday,
      requestsChange: parseFloat(percentChange),
      averageResponseTime: Math.round(avgResponseTime.rows[0]?.avg || 0),
      userStats: {
        total: 0,
        pending: 0,
        active: 0,
        suspended: 0
      }
    });
  } catch (err) {
    sendError(res, err.message);
  }
});

// 2. GET /admin/analytics/top-states - Bar chart data
router.get('/top-states', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.state_name as name,
        COUNT(v.village_code) as villages
      FROM states s
      LEFT JOIN districts d ON s.state_code = d.state_code
      LEFT JOIN subdistricts sd ON d.district_code = sd.district_code
      LEFT JOIN villages v ON sd.subdistrict_code = v.subdistrict_code
      GROUP BY s.state_code, s.state_name
      ORDER BY villages DESC
      LIMIT 10
    `);
    
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 3. GET /admin/analytics/requests-timeline - Line chart data
router.get('/requests-timeline', async (req, res) => {
  try {
    const days = req.query.days || 30;
    
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        AVG(response_time) as avgResponseTime
      FROM api_logs
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    const formatted = result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      requests: parseInt(row.requests),
      avgResponseTime: Math.round(parseFloat(row.avg_response_time || 0))
    }));
    
    sendResponse(res, formatted);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 4. GET /admin/analytics/user-distribution - Pie chart data
router.get('/user-distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(plan, 'free') as name,
        COUNT(*) as value
      FROM users
      WHERE status = 'active'
      GROUP BY plan
    `);
    
    const data = result.rows.map(row => ({
      name: row.name.charAt(0).toUpperCase() + row.name.slice(1),
      value: parseInt(row.value)
    }));
    
    sendResponse(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 5. GET /admin/analytics/response-time-trends - Area chart data
router.get('/response-time-trends', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99,
        AVG(response_time) as avg
      FROM api_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour ASC
    `);
    
    const formatted = result.rows.map(row => ({
      time: new Date(row.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      p95: Math.round(parseFloat(row.p95 || 0)),
      p99: Math.round(parseFloat(row.p99 || 0)),
      avg: Math.round(parseFloat(row.avg || 0))
    }));
    
    sendResponse(res, formatted);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 6. GET /admin/analytics/requests-by-endpoint - Stacked bar data
router.get('/requests-by-endpoint', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        endpoint,
        COUNT(*) as count,
        COUNT(CASE WHEN status_code < 400 THEN 1 END) as success,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors
      FROM api_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const formatted = result.rows.map(row => ({
      name: row.endpoint || 'unknown',
      successful: parseInt(row.success),
      failed: parseInt(row.errors),
      total: parseInt(row.count)
    }));
    
    sendResponse(res, formatted);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 7. GET /admin/analytics/usage-heatmap - Heat map data
router.get('/usage-heatmap', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as requests
      FROM api_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `);
    
    // Create 24-hour array
    const heatData = Array(24).fill(0);
    result.rows.forEach(row => {
      heatData[parseInt(row.hour)] = parseInt(row.requests);
    });
    
    const formatted = heatData.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      requests: count,
      intensity: Math.min((count / 100) * 100, 100) // Normalize to 0-100
    }));
    
    sendResponse(res, formatted);
  } catch (err) {
    sendError(res, err.message);
  }
});

module.exports = router;
