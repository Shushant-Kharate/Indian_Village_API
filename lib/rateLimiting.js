const pool = require('../db');

const PLAN_LIMITS = {
  free: {
    dailyLimit: 5000,
    burstLimit: 100,
    stateAccess: 1,
    maxApiKeys: 2,
    price: 0
  },
  premium: {
    dailyLimit: 50000,
    burstLimit: 500,
    stateAccess: 5,
    maxApiKeys: 5,
    price: 49
  },
  pro: {
    dailyLimit: 300000,
    burstLimit: 2000,
    stateAccess: 28,
    maxApiKeys: 10,
    price: 199
  },
  unlimited: {
    dailyLimit: 1000000,
    burstLimit: 5000,
    stateAccess: 28,
    maxApiKeys: 20,
    price: 499
  }
};

// Get user's plan
const getUserPlan = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT plan FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.plan || 'free';
  } catch (err) {
    console.error('Error fetching user plan:', err);
    return 'free';
  }
};

// Check and update usage
const checkAndUpdateUsage = async (userId, apiKey) => {
  try {
    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan];
    const today = new Date().toISOString().split('T')[0];

    // Get or create usage record
    let usage = await pool.query(
      'SELECT * FROM api_usage WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (usage.rows.length === 0) {
      // Create new usage record
      await pool.query(
        `INSERT INTO api_usage (user_id, date, requests_today, request_limit, plan)
         VALUES ($1, $2, 0, $3, $4)`,
        [userId, today, limits.dailyLimit, plan]
      );
      usage = await pool.query(
        'SELECT * FROM api_usage WHERE user_id = $1 AND date = $2',
        [userId, today]
      );
    }

    const currentUsage = usage.rows[0];

    // Check if limit exceeded
    if (currentUsage.requests_today >= limits.dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: limits.dailyLimit,
        resetAt: new Date(today + 'T23:59:59Z')
      };
    }

    // Increment usage
    await pool.query(
      'UPDATE api_usage SET requests_today = requests_today + 1 WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    const remaining = limits.dailyLimit - currentUsage.requests_today - 1;

    return {
      allowed: true,
      remaining,
      limit: limits.dailyLimit,
      resetAt: new Date(today + 'T23:59:59Z'),
      plan
    };
  } catch (err) {
    console.error('Error checking rate limit:', err);
    return {
      allowed: true,
      remaining: 0,
      limit: 0,
      resetAt: new Date()
    };
  }
};

// Rate limit middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    const rateLimitInfo = await checkAndUpdateUsage(userId, req.headers['x-api-key']);

    if (!rateLimitInfo.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Daily quota has been reached.',
        code: 'RATE_LIMITED',
        meta: {
          limit: rateLimitInfo.limit,
          remaining: 0,
          resetAt: rateLimitInfo.resetAt.toISOString()
        }
      });
    }

    // Add rate limit info to response headers
    res.set('X-RateLimit-Limit', rateLimitInfo.limit);
    res.set('X-RateLimit-Remaining', rateLimitInfo.remaining);
    res.set('X-RateLimit-Reset', rateLimitInfo.resetAt.toISOString());

    req.rateLimitInfo = rateLimitInfo;
    next();
  } catch (err) {
    console.error('Rate limit middleware error:', err);
    next();
  }
};

// Get plan limits
const getPlanLimits = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.free;

// Upgrade user plan
const upgradeUserPlan = async (userId, newPlan) => {
  try {
    await pool.query(
      'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2',
      [newPlan, userId]
    );
    return { success: true, plan: newPlan };
  } catch (err) {
    console.error('Error upgrading plan:', err);
    throw err;
  }
};

module.exports = {
  rateLimitMiddleware,
  checkAndUpdateUsage,
  getUserPlan,
  getPlanLimits,
  upgradeUserPlan,
  PLAN_LIMITS
};
