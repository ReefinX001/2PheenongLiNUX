const { cacheService } = require('../config/cache');

/**
 * Cache Performance Optimizer
 * ปรับปรุง performance ของ Redis caching
 */
class CacheOptimizer {
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Optimized cache middleware with better key generation
   */
  optimizedCache(ttl = 300, options = {}) {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const startTime = Date.now();

      // Generate optimized cache key
      const cacheKey = this.generateOptimizedKey(req, options);

      try {
        // Try to get from cache
        const cached = await cacheService.get(cacheKey);

        if (cached) {
          // Cache HIT
          this.stats.hits++;
          this.stats.totalRequests++;

          const responseTime = Date.now() - startTime;
          this.updateAvgResponseTime(responseTime);

          res.setHeader('X-Cache-Status', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
          res.setHeader('X-Response-Time', `${responseTime}ms`);

          return res.json(cached);
        }

        // Cache MISS - store original json method
        const originalJson = res.json;

        res.json = function(data) {
          // Update stats
          this.stats.misses++;
          this.stats.totalRequests++;

          const responseTime = Date.now() - startTime;
          this.updateAvgResponseTime(responseTime);

          res.setHeader('X-Cache-Status', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);
          res.setHeader('X-Response-Time', `${responseTime}ms`);

          // Cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Optimize TTL based on data type
            const optimizedTTL = this.optimizeTTL(req, data, ttl);

            cacheService.set(cacheKey, data, optimizedTTL).catch(err => {
              console.error('Cache set error:', err);
            });
          }

          originalJson.call(this, data);
        }.bind(this);

        next();

      } catch (error) {
        console.error('Cache optimizer error:', error);
        next();
      }
    };
  }

  /**
   * Generate optimized cache key
   */
  generateOptimizedKey(req, options = {}) {
    const { originalUrl, query, user, headers } = req;

    // Base key from URL
    let key = `route:${originalUrl}`;

    // Add query parameters (sorted for consistency)
    if (Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .map(k => `${k}=${query[k]}`)
        .join('&');
      key += `:query:${sortedQuery}`;
    }

    // Add user context if needed
    if (options.userSpecific && user) {
      key += `:user:${user.id}`;

      if (user.role) {
        key += `:role:${user.role}`;
      }
    }

    // Add branch context for multi-branch data
    if (options.branchSpecific) {
      const branchId = query.branchId || headers['x-branch-id'] || user?.branchId;
      if (branchId) {
        key += `:branch:${branchId}`;
      }
    }

    // Hash long keys for better performance
    if (key.length > 250) {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(key).digest('hex');
      key = `route:hash:${hash}`;
    }

    return key;
  }

  /**
   * Optimize TTL based on data characteristics
   */
  optimizeTTL(req, data, baseTTL) {
    const url = req.originalUrl || req.url;

    // Master data - longer TTL
    if (this.isMasterData(url)) {
      return Math.max(baseTTL, 1800); // At least 30 minutes
    }

    // Real-time data - shorter TTL
    if (this.isRealTimeData(url)) {
      return Math.min(baseTTL, 60); // At most 1 minute
    }

    // Large datasets - longer TTL to avoid frequent regeneration
    if (Array.isArray(data) && data.length > 100) {
      return baseTTL * 1.5;
    }

    // Small datasets - standard TTL
    return baseTTL;
  }

  /**
   * Check if URL represents master data
   */
  isMasterData(url) {
    const masterDataPatterns = [
      /\/branches/i,
      /\/categories/i,
      /\/suppliers/i,
      /\/chart-of-accounts/i,
      /\/provinces/i,
      /\/user-roles/i
    ];

    return masterDataPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL represents real-time data
   */
  isRealTimeData(url) {
    const realTimePatterns = [
      /\/today/i,
      /\/current/i,
      /\/live/i,
      /\/pos/i,
      /\/transactions/i
    ];

    return realTimePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Update average response time
   */
  updateAvgResponseTime(responseTime) {
    if (this.stats.totalRequests === 1) {
      this.stats.avgResponseTime = responseTime;
    } else {
      this.stats.avgResponseTime = (
        (this.stats.avgResponseTime * (this.stats.totalRequests - 1) + responseTime) /
        this.stats.totalRequests
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 ?
      (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      missRate: `${(100 - parseFloat(hitRate)).toFixed(2)}%`
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Cache warming with priority
   */
  async warmCache(endpoints = []) {
    console.log('🔥 Starting priority cache warming...');

    for (const endpoint of endpoints) {
      try {
        // Simulate request for caching
        const mockReq = {
          originalUrl: endpoint.url,
          query: endpoint.query || {},
          method: 'GET',
          headers: {},
          user: endpoint.user || null
        };

        const cacheKey = this.generateOptimizedKey(mockReq, endpoint.options || {});

        // Pre-populate cache if not exists
        const exists = await cacheService.get(cacheKey);
        if (!exists && endpoint.data) {
          await cacheService.set(cacheKey, endpoint.data, endpoint.ttl || 300);
          console.log(`✅ Warmed: ${endpoint.url}`);
        }

      } catch (error) {
        console.error(`❌ Failed to warm ${endpoint.url}:`, error.message);
      }
    }
  }
}

// Export singleton
const cacheOptimizer = new CacheOptimizer();

module.exports = {
  cacheOptimizer,
  optimizedCache: (ttl, options) => cacheOptimizer.optimizedCache(ttl, options)
};