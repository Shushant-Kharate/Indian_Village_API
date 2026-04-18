/**
 * API Key Management Routes
 * Handle creation, listing, deletion, and rotation of API keys
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

/**
 * Generate a random API key and secret
 */
const generateKeyPair = () => {
  const key = 'ak_' + crypto.randomBytes(16).toString('hex');
  const secret = 'as_' + crypto.randomBytes(16).toString('hex');
  return { key, secret };
};

/**
 * List user's API keys
 * GET /api/v1/user/api-keys
 */
router.get('/user/api-keys', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, key, secret, created_at, last_used, monthly_requests 
       FROM api_keys 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error listing API keys:', err);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * Create new API key
 * POST /api/v1/user/api-keys
 */
router.post('/user/api-keys', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    // Check limit based on plan
    const planLimits = {
      free: 2,
      premium: 5,
      pro: 10,
      unlimited: 20
    };

    const userPlan = req.user.plan || 'free';
    const limit = planLimits[userPlan] || 2;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM api_keys WHERE user_id = $1',
      [req.user.id]
    );

    const currentCount = parseInt(countResult.rows[0].count);
    if (currentCount >= limit) {
      return res.status(400).json({
        error: `API key limit (${limit}) reached for ${userPlan} plan`
      });
    }

    // Generate key pair
    const { key, secret } = generateKeyPair();
    const hashedSecret = await bcrypt.hash(secret, 10);

    // Insert into database
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, name, key, secret, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, name, key, secret, created_at`,
      [req.user.id, name, key, hashedSecret]
    );

    // Return the secret only once (user must save it)
    res.status(201).json({
      success: true,
      message: 'API key created. Save your secret now - it cannot be retrieved later!',
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        key: result.rows[0].key,
        secret: secret  // Return plain secret only on creation
      }
    });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * Delete API key
 * DELETE /api/v1/user/api-keys/:keyId
 */
router.delete('/user/api-keys/:keyId', authMiddleware, async (req, res) => {
  try {
    const { keyId } = req.params;

    // Verify ownership
    const keyResult = await pool.query(
      'SELECT user_id FROM api_keys WHERE id = $1',
      [keyId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (keyResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete the key
    await pool.query('DELETE FROM api_keys WHERE id = $1', [keyId]);

    res.json({
      success: true,
      message: 'API key deleted'
    });
  } catch (err) {
    console.error('Error deleting API key:', err);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

/**
 * Rotate API secret (generates new secret for existing key)
 * POST /api/v1/user/api-keys/:keyId/rotate
 */
router.post('/user/api-keys/:keyId/rotate', authMiddleware, async (req, res) => {
  try {
    const { keyId } = req.params;

    // Verify ownership
    const keyResult = await pool.query(
      'SELECT user_id, name, key FROM api_keys WHERE id = $1',
      [keyId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (keyResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Generate new secret
    const { secret } = generateKeyPair();
    const hashedSecret = await bcrypt.hash(secret, 10);

    // Update database
    await pool.query(
      'UPDATE api_keys SET secret = $1, rotated_at = NOW() WHERE id = $2',
      [hashedSecret, keyId]
    );

    // Log the rotation
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
      [req.user.id, 'API_KEY_ROTATED', `API key ${keyResult.rows[0].key} secret rotated`]
    );

    res.json({
      success: true,
      message: 'API secret rotated successfully',
      data: {
        id: keyId,
        key: keyResult.rows[0].key,
        secret: secret  // Return new secret
      }
    });
  } catch (err) {
    console.error('Error rotating API secret:', err);
    res.status(500).json({ error: 'Failed to rotate API secret' });
  }
});

/**
 * Get API key usage statistics
 * GET /api/v1/user/api-keys/:keyId/usage
 */
router.get('/user/api-keys/:keyId/usage', authMiddleware, async (req, res) => {
  try {
    const { keyId } = req.params;
    const days = Math.min(parseInt(req.query.days) || 7, 30);

    // Verify ownership
    const keyResult = await pool.query(
      'SELECT user_id, key FROM api_keys WHERE id = $1',
      [keyId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (keyResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get usage stats
    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
        AVG(response_time) as avg_response_time
       FROM api_logs 
       WHERE api_key = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [keyResult.rows[0].key]
    );

    res.json({
      success: true,
      data: result.rows,
      meta: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (err) {
    console.error('Error fetching key usage:', err);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

/**
 * Get user's daily usage
 * GET /api/v1/user/usage
 */
router.get('/user/usage', authMiddleware, async (req, res) => {
  try {
    // Get today's date in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get user's plan and daily limit
    const userResult = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [req.user.id]
    );

    const plan = userResult.rows[0].plan;
    const planLimits = {
      free: { dailyLimit: 5000, burstLimit: 100, stateAccess: 1, maxStateAccess: 28 },
      premium: { dailyLimit: 50000, burstLimit: 500, stateAccess: 5, maxStateAccess: 28 },
      pro: { dailyLimit: 300000, burstLimit: 2000, stateAccess: 28, maxStateAccess: 28 },
      unlimited: { dailyLimit: 1000000, burstLimit: 5000, stateAccess: 28, maxStateAccess: 28 }
    };

    const limits = planLimits[plan] || planLimits.free;

    // Get today's usage
    const usageResult = await pool.query(
      `SELECT COUNT(*) as total FROM api_logs 
       WHERE user_id = $1 AND created_at >= $2`,
      [req.user.id, today.toISOString()]
    );

    const requestsUsedToday = parseInt(usageResult.rows[0].total);

    // Hardcode limits based on plan since state_access table doesn't exist
    const stateAccessCount = plan === 'Free' ? 1 : (plan === 'Premium' ? 5 : 28);

    res.json({
      success: true,
      data: {
        plan,
        requestsUsedToday,
        dailyLimit: limits.dailyLimit,
        burstLimit: limits.burstLimit,
        stateAccessCount,
        maxStateAccess: limits.maxStateAccess,
        percentageUsed: Math.round((requestsUsedToday / limits.dailyLimit) * 100)
      }
    });
  } catch (err) {
    console.error('Error fetching usage:', err);
    res.status(500).json({ error: 'Failed to fetch usage stats', details: err.message });
  }
});

module.exports = {
  apiKeyRoutes: router,
  generateKeyPair
};
