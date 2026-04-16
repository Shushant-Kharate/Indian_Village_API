/**
 * Redis Caching Module
 * Handles caching of frequently accessed data
 */

const redis = require('redis');

let client;
let isConnected = false;

/**
 * Initialize Redis client
 */
const initializeRedis = async () => {
  try {
    client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.warn('Redis connection refused. Caching disabled.');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    client.on('connect', () => {
      console.log('Redis connected');
      isConnected = true;
    });

    client.on('error', (err) => {
      console.warn('Redis error:', err.message);
      isConnected = false;
    });

    client.on('ready', () => {
      console.log('Redis ready for commands');
    });

    return new Promise((resolve) => {
      client.ping((err, reply) => {
        if (err) {
          console.warn('Redis ping failed:', err.message);
          isConnected = false;
        } else {
          console.log('Redis ping response:', reply);
          isConnected = true;
        }
        resolve();
      });
    });
  } catch (err) {
    console.warn('Failed to initialize Redis:', err.message);
    isConnected = false;
  }
};

/**
 * Get cached value
 */
const get = (key) => {
  return new Promise((resolve) => {
    if (!isConnected || !client) {
      resolve(null);
      return;
    }

    client.get(key, (err, data) => {
      if (err) {
        console.warn('Redis get error:', err);
        resolve(null);
        return;
      }

      if (data) {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      } else {
        resolve(null);
      }
    });
  });
};

/**
 * Set cached value with expiry (TTL in seconds)
 */
const set = (key, value, ttl = 3600) => {
  return new Promise((resolve) => {
    if (!isConnected || !client) {
      resolve(false);
      return;
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttl) {
        client.setex(key, ttl, serialized, (err) => {
          if (err) {
            console.warn('Redis setex error:', err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } else {
        client.set(key, serialized, (err) => {
          if (err) {
            console.warn('Redis set error:', err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      }
    } catch (err) {
      console.warn('Redis set error:', err);
      resolve(false);
    }
  });
};

/**
 * Delete cached value(s)
 */
const del = (keys) => {
  return new Promise((resolve) => {
    if (!isConnected || !client) {
      resolve(false);
      return;
    }

    const keyArray = Array.isArray(keys) ? keys : [keys];
    client.del(...keyArray, (err) => {
      if (err) {
        console.warn('Redis del error:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

/**
 * Clear all cache (use with caution)
 */
const flushAll = () => {
  return new Promise((resolve) => {
    if (!isConnected || !client) {
      resolve(false);
      return;
    }

    client.flushall((err) => {
      if (err) {
        console.warn('Redis flushall error:', err);
        resolve(false);
      } else {
        console.log('Redis cache flushed');
        resolve(true);
      }
    });
  });
};

/**
 * Cache middleware for Express
 * Usage: app.use(cacheMiddleware('key_prefix', 3600))
 */
const cacheMiddleware = (keyPrefix, ttl = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;

    // Try to get from cache
    const cachedData = await get(cacheKey);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function (data) {
      if (data && typeof data === 'object') {
        set(cacheKey, data, ttl).catch(err => 
          console.warn('Failed to cache response:', err)
        );
      }
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache invalidation patterns
 */
const invalidatePattern = (pattern) => {
  return new Promise((resolve) => {
    if (!isConnected || !client) {
      resolve(false);
      return;
    }

    client.keys(pattern, (err, keys) => {
      if (err || !keys || keys.length === 0) {
        resolve(false);
        return;
      }

      client.del(...keys, (err) => {
        if (err) {
          console.warn('Redis pattern delete error:', err);
          resolve(false);
        } else {
          console.log(`Redis invalidated ${keys.length} keys matching ${pattern}`);
          resolve(true);
        }
      });
    });
  });
};

/**
 * Close Redis connection
 */
const close = () => {
  return new Promise((resolve) => {
    if (client) {
      client.quit((err) => {
        if (err) {
          console.warn('Error closing Redis:', err);
        } else {
          console.log('Redis connection closed');
          isConnected = false;
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
};

/**
 * Get connection status
 */
const getStatus = () => {
  return {
    connected: isConnected,
    ready: isConnected
  };
};

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  flushAll,
  cacheMiddleware,
  invalidatePattern,
  close,
  getStatus
};
