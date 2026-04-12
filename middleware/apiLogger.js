const pool = require('../db');

// API request logging middleware
const apiLogger = async (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request ID in request object
  req.requestId = requestId;

  // Intercept response to log it
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Log to database (non-blocking)
    logApiRequest({
      requestId,
      apiKey: (req.headers['x-api-key'] || req.headers.authorization?.split('Bearer ')[1] || 'unknown').substring(0, 10),
      userId: req.userId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      ipAddress,
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('Logging error:', err));

    // Call original json function
    return originalJson.call(this, data);
  };

  next();
};

// Function to log API request to database
const logApiRequest = async (logData) => {
  try {
    // Create logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(50) UNIQUE,
        api_key VARCHAR(20),
        user_id INTEGER,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        status_code INTEGER,
        response_time INTEGER,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_logs(api_key);
    `);

    // Insert log entry
    await pool.query(
      `INSERT INTO api_logs (
        request_id, api_key, user_id, endpoint, method, 
        status_code, response_time, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        logData.requestId,
        logData.apiKey,
        logData.userId || null,
        logData.endpoint,
        logData.method,
        logData.statusCode,
        logData.responseTime,
        logData.ipAddress,
        logData.userAgent
      ]
    );
  } catch (err) {
    console.error('Failed to log API request:', err.message);
  }
};

// Function to retrieve API logs
const getApiLogs = async (filters = {}) => {
  let query = 'SELECT * FROM api_logs WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(new Date(filters.startDate));
    paramIndex++;
  }

  if (filters.endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(new Date(filters.endDate));
    paramIndex++;
  }

  if (filters.apiKey) {
    query += ` AND api_key LIKE $${paramIndex}`;
    params.push(filters.apiKey + '%');
    paramIndex++;
  }

  if (filters.endpoint) {
    query += ` AND endpoint LIKE $${paramIndex}`;
    params.push(filters.endpoint + '%');
    paramIndex++;
  }

  if (filters.statusCode) {
    query += ` AND status_code = $${paramIndex}`;
    params.push(filters.statusCode);
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC LIMIT 1000';

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  apiLogger,
  logApiRequest,
  getApiLogs
};
