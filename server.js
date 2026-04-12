require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const auth = require('./auth');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { apiLogger } = require('./middleware/apiLogger');
const { initializeDatabaseTables } = require('./lib/database');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add timing for response
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// API Logger middleware
app.use(apiLogger);

// Initialize database tables
initializeDatabaseTables().catch(err => console.error('Database init failed:', err));

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✓ Database connected at', result.rows[0].now);
  }
});

// Standard response helper functions
const sendResponse = (res, data, statusCode = 200, rateLimit = null) => {
  const isArray = Array.isArray(data);
  const response = {
    success: true,
    count: isArray ? data.length : undefined,
    data: data,
    meta: {
      requestId: res.req?.requestId || `req_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: Date.now() - (res.req?.startTime || Date.now())
    }
  };

  if (rateLimit) {
    response.meta.rateLimit = rateLimit;
  }

  res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 500, code = 'INTERNAL_ERROR') => {
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    meta: {
      requestId: res.req?.requestId || `req_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: Date.now() - (res.req?.startTime || Date.now())
    }
  });
};

// ============================================
// PUBLIC AUTH ENDPOINTS (No authentication required)
// ============================================

// Register new user
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName } = req.body;
    
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'INVALID_REQUEST');
    }

    const user = await auth.register(email, password, name || 'User');
    sendResponse(res, { user, message: 'User registered successfully' }, 201);
  } catch (err) {
    sendError(res, err.message, 400, 'REGISTRATION_FAILED');
  }
});

// Login user
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'INVALID_REQUEST');
    }

    const result = await auth.login(email, password);
    sendResponse(res, { 
      token: result.token,
      userId: result.userId,
      email: result.email,
      name: result.name,
      message: 'Login successful'
    });
  } catch (err) {
    sendError(res, err.message, 401, 'LOGIN_FAILED');
  }
});

// ============================================
// PROTECTED ENDPOINTS (Authentication required)
// ============================================

// Generate API key
app.post('/auth/api-keys', auth.authMiddleware, async (req, res) => {
  try {
    const apiKey = await auth.generateApiKey(req.userId);
    sendResponse(res, { apiKey, message: 'API key generated successfully' }, 201);
  } catch (err) {
    sendError(res, err.message, 500, 'API_KEY_GENERATION_FAILED');
  }
});

// Get user's API keys
app.get('/auth/api-keys', auth.authMiddleware, async (req, res) => {
  try {
    const apiKeys = await auth.getUserApiKeys(req.userId);
    sendResponse(res, apiKeys);
  } catch (err) {
    sendError(res, err.message, 500, 'FETCH_FAILED');
  }
});

// Revoke API key
app.delete('/auth/api-keys/:keyId', auth.authMiddleware, async (req, res) => {
  try {
    const { keyId } = req.params;
    const result = await auth.revokeApiKey(req.userId, keyId);
    sendResponse(res, { message: 'API key revoked successfully' });
  } catch (err) {
    sendError(res, err.message, 400, 'REVOKE_FAILED');
  }
});

// ============================================
// API v1 ENDPOINTS (Public data endpoints)
// ============================================

// Custom rate limiting middleware for auth endpoints that doesn't require API key
const v1RateLimitMiddleware = (req, res, next) => {
  const now = Date.now();
  const key = req.userId || req.ip;
  
  if (!req.rateLimitData) req.rateLimitData = new Map();
  if (!req.rateLimitData.has(key)) {
    req.rateLimitData.set(key, { count: 0, resetAt: now + 3600000 });
  }
  
  const data = req.rateLimitData.get(key);
  
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + 3600000;
  }
  
  if (data.count >= 1000) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  data.count++;
  req.rateLimitInfo = {
    limit: 1000,
    remaining: 1000 - data.count,
    resetAt: new Date(data.resetAt).toISOString()
  };
  
  next();
};

// Apply rate limiting to all v1 endpoints
app.use('/api/v1', v1RateLimitMiddleware);

// 1. Get all states
app.get('/api/v1/states', auth.authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM states ORDER BY state_name');
    const rateLimit = req.rateLimitInfo;
    sendResponse(res, result.rows, 200, rateLimit);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 2. Get districts by state
app.get('/api/v1/states/:stateCode/districts', auth.authMiddleware, async (req, res) => {
  try {
    const { stateCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM districts WHERE state_code = $1 ORDER BY district_name',
      [stateCode]
    );
    sendResponse(res, result.rows, 200, req.rateLimitInfo);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 3. Get subdistricts by district
app.get('/api/v1/districts/:districtCode/subdistricts', auth.authMiddleware, async (req, res) => {
  try {
    const { districtCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM subdistricts WHERE district_code = $1 ORDER BY subdistrict_name',
      [districtCode]
    );
    sendResponse(res, result.rows, 200, req.rateLimitInfo);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 4. Get villages by subdistrict
app.get('/api/v1/subdistricts/:subdistrictCode/villages', auth.authMiddleware, async (req, res) => {
  try {
    const { subdistrictCode } = req.params;
    const { page = 1, limit = 1000 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT 
        village_code as value, 
        village_name as label,
        village_name as village,
        subdistrict_code
      FROM villages 
      WHERE subdistrict_code = $1 
      ORDER BY village_name 
      LIMIT $2 OFFSET $3`,
      [subdistrictCode, limit, offset]
    );
    sendResponse(res, result.rows, 200, req.rateLimitInfo);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 5. Search/Autocomplete
app.get('/api/v1/search', auth.authMiddleware, async (req, res) => {
  try {
    const { q, hierarchyLevel = 'village', limit = 50 } = req.query;

    if (!q || q.length < 2) {
      return sendError(res, 'Search query must be at least 2 characters', 400, 'INVALID_QUERY');
    }

    let query, params;

    switch(hierarchyLevel) {
      case 'state':
        query = `SELECT state_code as value, state_name as label FROM states 
                 WHERE state_name ILIKE $1 LIMIT $2`;
        params = [`%${q}%`, limit];
        break;
      case 'district':
        query = `SELECT district_code as value, district_name as label FROM districts 
                 WHERE district_name ILIKE $1 LIMIT $2`;
        params = [`%${q}%`, limit];
        break;
      case 'subdistrict':
        query = `SELECT subdistrict_code as value, subdistrict_name as label FROM subdistricts 
                 WHERE subdistrict_name ILIKE $1 LIMIT $2`;
        params = [`%${q}%`, limit];
        break;
      default: // village
        query = `SELECT 
          village_code as value,
          village_name as label,
          village_name,
          sd.subdistrict_name,
          d.district_name,
          s.state_name,
          CONCAT(v.village_name, ', ', sd.subdistrict_name, ', ', d.district_name, ', ', s.state_name, ', India') as fullAddress
        FROM villages v
        JOIN subdistricts sd ON v.subdistrict_code = sd.subdistrict_code
        JOIN districts d ON sd.district_code = d.district_code
        JOIN states s ON d.state_code = s.state_code
        WHERE v.village_name ILIKE $1 
        LIMIT $2`;
        params = [`%${q}%`, limit];
    }

    const result = await pool.query(query, params);
    sendResponse(res, result.rows, 200, req.rateLimitInfo);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 6. Get full hierarchy
app.get('/api/v1/hierarchy', auth.authMiddleware, async (req, res) => {
  try {
    const { stateCode, districtCode, subdistrictCode } = req.query;

    if (!stateCode) {
      return sendError(res, 'stateCode parameter required', 400, 'MISSING_PARAMETER');
    }

    let query = `SELECT 
      s.state_code, s.state_name,
      d.district_code, d.district_name,
      sd.subdistrict_code, sd.subdistrict_name,
      v.village_code, v.village_name
    FROM villages v
    JOIN subdistricts sd ON v.subdistrict_code = sd.subdistrict_code
    JOIN districts d ON sd.district_code = d.district_code
    JOIN states s ON d.state_code = s.state_code
    WHERE s.state_code = $1`;

    const params = [stateCode];
    let paramIndex = 2;

    if (districtCode) {
      query += ` AND d.district_code = $${paramIndex}`;
      params.push(districtCode);
      paramIndex++;
    }

    if (subdistrictCode) {
      query += ` AND sd.subdistrict_code = $${paramIndex}`;
      params.push(subdistrictCode);
      paramIndex++;
    }

    query += ` ORDER BY s.state_name, d.district_name, sd.subdistrict_name, v.village_name LIMIT 10000`;

    const result = await pool.query(query, params);
    sendResponse(res, result.rows, 200, req.rateLimitInfo);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 7. Get statistics
app.get('/api/v1/stats', auth.authMiddleware, async (req, res) => {
  try {
    const states = await pool.query('SELECT COUNT(*) as count FROM states');
    const districts = await pool.query('SELECT COUNT(*) as count FROM districts');
    const subdistricts = await pool.query('SELECT COUNT(*) as count FROM subdistricts');
    const villages = await pool.query('SELECT COUNT(*) as count FROM villages');

    sendResponse(res, {
      states: parseInt(states.rows[0].count),
      districts: parseInt(districts.rows[0].count),
      subdistricts: parseInt(subdistricts.rows[0].count),
      villages: parseInt(villages.rows[0].count)
    }, 200, req.rateLimitInfo);
  } catch (err) {
    sendError(res, err.message, 500, 'QUERY_ERROR');
  }
});

// 8. Health check (no auth required)
app.get('/api/v1/health', (req, res) => {
  sendResponse(res, {
    status: 'API is running ✓',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// LEGACY ENDPOINTS (for backwards compatibility)
// ============================================

// Legacy /api/states endpoint
app.get('/api/states', auth.authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM states ORDER BY state_name');
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// Legacy /api/stats endpoint
app.get('/api/stats', auth.authMiddleware, async (req, res) => {
  try {
    const states = await pool.query('SELECT COUNT(*) as count FROM states');
    const districts = await pool.query('SELECT COUNT(*) as count FROM districts');
    const subdistricts = await pool.query('SELECT COUNT(*) as count FROM subdistricts');
    const villages = await pool.query('SELECT COUNT(*) as count FROM villages');

    sendResponse(res, {
      states: parseInt(states.rows[0].count),
      districts: parseInt(districts.rows[0].count),
      subdistricts: parseInt(subdistricts.rows[0].count),
      villages: parseInt(villages.rows[0].count)
    });
  } catch (err) {
    sendError(res, err.message);
  }
});

// Legacy /api/health endpoint
app.get('/api/health', (req, res) => {
  sendResponse(res, {
    status: 'API is running ✓',
    hasDatabase: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV
  });
});

// ============================================
// ADMIN ROUTES
// ============================================
app.use('/admin/api', auth.authMiddleware, adminRoutes);

// Start server
const PORT = process.env.PORT || 3000;

// Only listen locally (not on Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API v1 Documentation:`);
    console.log(`  GET /api/v1/states - Get all states`);
    console.log(`  GET /api/v1/states/:stateCode/districts - Get districts`);
    console.log(`  GET /api/v1/districts/:districtCode/subdistricts - Get subdistricts`);
    console.log(`  GET /api/v1/subdistricts/:subdistrictCode/villages - Get villages`);
    console.log(`  GET /api/v1/search?q=village&hierarchyLevel=village - Search/Autocomplete`);
    console.log(`  GET /api/v1/hierarchy?stateCode=27 - Get full hierarchy`);
    console.log(`  GET /api/v1/stats - Get statistics\n`);
    console.log(`📊 Admin Panel:`);
    console.log(`  GET /admin/api/stats - Dashboard stats`);
    console.log(`  GET /admin/api/users - User management`);
    console.log(`  GET /admin/api/villages - Village browser`);
    console.log(`  GET /admin/api/logs - API logs\n`);
  });
}

// Export app for Vercel serverless environment
module.exports = app;
