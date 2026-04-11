require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool - optimized for serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,  // Only 1 connection for serverless
  idleTimeoutMillis: 10000,  // Close idle connections after 10s
  connectionTimeoutMillis: 5000,  // Timeout after 5s
});

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Full error:', err);
  } else {
    console.log('✓ Database connected:', result.rows[0].now);
  }
});

// Standard response helper functions
const sendResponse = (res, data, statusCode = 200) => {
  const isArray = Array.isArray(data);
  res.status(statusCode).json({
    success: true,
    count: isArray ? data.length : undefined,
    data: data,
    meta: {
      responseTime: new Date().toISOString(),
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`
    }
  });
};

const sendError = (res, message, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    meta: {
      responseTime: new Date().toISOString(),
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`
    }
  });
};

// Routes

// 1. Get all states
app.get('/api/states', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM states ORDER BY state_name');
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 2. Get districts by state
app.get('/api/districts/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM districts WHERE state_code = $1 ORDER BY district_name',
      [stateCode]
    );
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 3. Get subdistricts by district
app.get('/api/subdistricts/:districtCode', async (req, res) => {
  try {
    const { districtCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM subdistricts WHERE district_code = $1 ORDER BY subdistrict_name',
      [districtCode]
    );
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 4. Get villages by subdistrict
app.get('/api/villages/:subdistrictCode', async (req, res) => {
  try {
    const { subdistrictCode } = req.params;
    const result = await pool.query(
      'SELECT * FROM villages WHERE subdistrict_code = $1 ORDER BY village_name LIMIT 1000',
      [subdistrictCode]
    );
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 5. Search villages by name
app.get('/api/villages/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query(
      'SELECT * FROM villages WHERE LOWER(village_name) LIKE LOWER($1) LIMIT 100',
      [`%${name}%`]
    );
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 6. Get full hierarchy (state -> district -> subdistrict -> village)
app.get('/api/hierarchy/:stateCode/:districtCode/:subdistrictCode', async (req, res) => {
  try {
    const { stateCode, districtCode, subdistrictCode } = req.params;
    const result = await pool.query(
      `SELECT 
        s.state_name, d.district_name, sd.subdistrict_name, v.village_name
      FROM villages v
      JOIN subdistricts sd ON v.subdistrict_code = sd.subdistrict_code
      JOIN districts d ON sd.district_code = d.district_code
      JOIN states s ON d.state_code = s.state_code
      WHERE s.state_code = $1 AND d.district_code = $2 AND sd.subdistrict_code = $3
      ORDER BY v.village_name`,
      [stateCode, districtCode, subdistrictCode]
    );
    sendResponse(res, result.rows);
  } catch (err) {
    sendError(res, err.message);
  }
});

// 7. Get statistics
app.get('/api/stats', async (req, res) => {
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

// 8. Health check
app.get('/api/health', (req, res) => {
  sendResponse(res, {
    status: 'API is running ✓',
    hasDatabase: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV
  });
});

// Start server
const PORT = process.env.PORT || 3000;

// Only listen locally (not on Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`  GET /api/states - Get all states`);
    console.log(`  GET /api/districts/:stateCode - Get districts by state`);
    console.log(`  GET /api/subdistricts/:districtCode - Get subdistricts by district`);
    console.log(`  GET /api/villages/:subdistrictCode - Get villages by subdistrict`);
    console.log(`  GET /api/villages/search/:name - Search villages by name`);
    console.log(`  GET /api/hierarchy/:stateCode/:districtCode/:subdistrictCode - Get full hierarchy`);
    console.log(`  GET /api/stats - Get statistics`);
    console.log(`  GET /api/health - Health check\n`);
  });
}

// Export app for Vercel serverless environment
module.exports = app;
