// Cache Configuration
const Redis = require('ioredis');

// Redis connection for caching
// Redis instance ใหม่สำหรับโปรเจกต์นี้โดยเฉพาะ
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis-16972.crce185.ap-seast-1-1.ec2.redns.redis-cloud.com',
  port: process.env.REDIS_PORT || 16972,
  password: process.env.REDIS_PASSWORD || 'qLtC4Z14NHP7EEbMLjXySru6DSknvNOJ',
  username: process.env.REDIS_USERNAME || 'default',
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
});

// Cache wrapper class
class CacheService {
  constructor(client) {
    this.client = client;
    this.defaultTTL = 300; // 5 minutes default
    this.connected = false;

    // Connection handlers
    this.client.on('connect', () => {
      console.log('✅ Cache service connected');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      console.error('Cache service error:', err.message);
      this.connected = false;
    });
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (!this.connected) await this.client.connect();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.connected) await this.client.connect();
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    try {
      if (!this.connected) await this.client.connect();
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async flush() {
    try {
      if (!this.connected) await this.client.connect();
      await this.client.flushall();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Cache wrapper for functions
   */
  async cached(key, fn, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    try {
      if (!this.connected) await this.client.connect();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }
}

// Create cache service instance
const cacheService = new CacheService(redisClient);

// Express middleware for caching
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      // Try to get from cache
      const cached = await cacheService.get(key);

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Store original send function
      const originalSend = res.json;

      // Override json function to cache response
      res.json = function(data) {
        res.setHeader('X-Cache', 'MISS');

        // Cache the response
        cacheService.set(key, data, ttl).catch(err => {
          console.error('Failed to cache response:', err);
        });

        // Call original send
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      // If cache fails, continue without caching
      next();
    }
  };
};

// Database query cache wrapper
const queryCacheWrapper = (modelName) => {
  return {
    /**
     * Find with cache
     */
    async findCached(query, options = {}, ttl = 300) {
      const key = `db:${modelName}:find:${JSON.stringify({ query, options })}`;

      return cacheService.cached(key, async () => {
        const Model = require(`../models/${modelName}`);
        return Model.find(query, options);
      }, ttl);
    },

    /**
     * FindOne with cache
     */
    async findOneCached(query, options = {}, ttl = 300) {
      const key = `db:${modelName}:findOne:${JSON.stringify({ query, options })}`;

      return cacheService.cached(key, async () => {
        const Model = require(`../models/${modelName}`);
        return Model.findOne(query, options);
      }, ttl);
    },

    /**
     * Count with cache
     */
    async countCached(query, ttl = 300) {
      const key = `db:${modelName}:count:${JSON.stringify(query)}`;

      return cacheService.cached(key, async () => {
        const Model = require(`../models/${modelName}`);
        return Model.countDocuments(query);
      }, ttl);
    },

    /**
     * Invalidate model cache
     */
    async invalidateModelCache() {
      return cacheService.invalidatePattern(`db:${modelName}:*`);
    }
  };
};

// Session cache for user sessions
class SessionCache {
  constructor(cacheService) {
    this.cache = cacheService;
    this.prefix = 'session:';
    this.ttl = 3600; // 1 hour
  }

  async getSession(userId) {
    return this.cache.get(`${this.prefix}${userId}`);
  }

  async setSession(userId, sessionData) {
    return this.cache.set(`${this.prefix}${userId}`, sessionData, this.ttl);
  }

  async destroySession(userId) {
    return this.cache.del(`${this.prefix}${userId}`);
  }

  async extendSession(userId) {
    const session = await this.getSession(userId);
    if (session) {
      return this.setSession(userId, session);
    }
    return false;
  }
}

// API Response cache
class ApiCache {
  constructor(cacheService) {
    this.cache = cacheService;
    this.prefix = 'api:';
  }

  generateKey(endpoint, params = {}) {
    const paramStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return `${this.prefix}${endpoint}:${paramStr}`;
  }

  async get(endpoint, params) {
    const key = this.generateKey(endpoint, params);
    return this.cache.get(key);
  }

  async set(endpoint, params, data, ttl = 300) {
    const key = this.generateKey(endpoint, params);
    return this.cache.set(key, data, ttl);
  }

  async invalidate(endpoint) {
    return this.cache.invalidatePattern(`${this.prefix}${endpoint}:*`);
  }
}

// Create specialized cache instances
const sessionCache = new SessionCache(cacheService);
const apiCache = new ApiCache(cacheService);

module.exports = {
  cacheService,
  cacheMiddleware,
  queryCacheWrapper,
  sessionCache,
  apiCache,
  redisClient
};