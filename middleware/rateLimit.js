// Rate limiting configuration per plan
const RATE_LIMITS = {
  free: { requestsPerDay: 5000, burstPerMinute: 100 },
  premium: { requestsPerDay: 50000, burstPerMinute: 500 },
  pro: { requestsPerDay: 300000, burstPerMinute: 2000 },
  unlimited: { requestsPerDay: 1000000, burstPerMinute: 5000 }
};

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

const getRateLimitKey = (apiKey) => `ratelimit:${apiKey}`;
const getBurstKey = (apiKey) => `burst:${apiKey}`;

// Initialize/get rate limit data for API key
const initRateLimit = (apiKey, plan = 'free') => {
  const key = getRateLimitKey(apiKey);
  if (!rateLimitStore.has(key)) {
    const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;
    rateLimitStore.set(key, {
      count: 0,
      resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      plan,
      limit
    });
  }
  return rateLimitStore.get(key);
};

// Check and increment rate limit
const checkRateLimit = (apiKey, plan = 'free') => {
  const rateLimit = initRateLimit(apiKey, plan);
  const now = Date.now();

  // Reset if 24 hours have passed
  if (now >= rateLimit.resetTime) {
    rateLimit.count = 0;
    rateLimit.resetTime = now + 24 * 60 * 60 * 1000;
  }

  const isLimited = rateLimit.count >= rateLimit.limit.requestsPerDay;
  
  if (!isLimited) {
    rateLimit.count++;
  }

  return {
    isLimited,
    count: rateLimit.count,
    limit: rateLimit.limit.requestsPerDay,
    remaining: Math.max(0, rateLimit.limit.requestsPerDay - rateLimit.count),
    resetTime: new Date(rateLimit.resetTime).toISOString(),
    resetSeconds: Math.floor((rateLimit.resetTime - now) / 1000)
  };
};

// Middleware for rate limiting
const rateLimitMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.split('Bearer ')[1];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }

  // In production, fetch user plan from database
  const plan = req.userPlan || 'free';
  const rateLimitInfo = checkRateLimit(apiKey, plan);

  // Add rate limit info to request for response headers
  req.rateLimitInfo = rateLimitInfo;

  if (rateLimitInfo.isLimited) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      meta: {
        rateLimit: {
          limit: rateLimitInfo.limit,
          remaining: 0,
          resetTime: rateLimitInfo.resetTime
        }
      }
    }).set('Retry-After', rateLimitInfo.resetSeconds);
  }

  next();
};

module.exports = {
  rateLimitMiddleware,
  checkRateLimit,
  RATE_LIMITS
};
