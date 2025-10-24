// Performance Optimization Middleware
const compression = require('compression');
const { cacheMiddleware } = require('../config/cache');

// Response time tracking
const responseTime = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const responseTimeMs = Number(end - start) / 1000000;
    res.setHeader('X-Response-Time', `${responseTimeMs.toFixed(2)}ms`);
  });

  next();
};

// Compression middleware configuration
const compressionConfig = compression({
  level: 6, // Balance between speed and compression
  threshold: 1024, // Only compress responses > 1kb
  filter: (req, res) => {
    // Don't compress for specific routes
    if (req.url.includes('/stream')) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// ETag support for caching
const etag = require('etag');
const etagMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    // Generate ETag for response
    const etagValue = etag(data);
    res.setHeader('ETag', etagValue);

    // Check if client has matching ETag
    if (req.headers['if-none-match'] === etagValue) {
      res.status(304).end();
      return;
    }

    originalSend.call(this, data);
  };

  next();
};

// Query optimization middleware
const queryOptimization = (req, res, next) => {
  // Add lean() to mongoose queries for better performance
  if (req.query) {
    // Limit default page size
    if (req.query.limit && parseInt(req.query.limit) > 100) {
      req.query.limit = '100';
    }

    // Add lean flag for read operations
    if (req.method === 'GET') {
      req.mongooseLean = true;
    }
  }

  next();
};

// Connection pooling optimization
const connectionPooling = {
  // MongoDB connection pool settings
  mongodb: {
    minPoolSize: 10,
    maxPoolSize: 100,
    maxIdleTimeMS: 10000,
    waitQueueTimeoutMS: 5000
  },

  // Redis connection pool
  redis: {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    }
  }
};

// Static file caching headers
const staticCacheHeaders = (req, res, next) => {
  // Set cache headers for static files
  if (req.url.match(/\.(js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  next();
};

// Resource hints for faster loading
const resourceHints = (req, res, next) => {
  // Add preconnect hints for external resources
  res.setHeader('Link', [
    '<https://fonts.googleapis.com>; rel=preconnect',
    '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
    '</dist/vendor.bundle.js>; rel=preload; as=script',
    '</dist/app.bundle.js>; rel=preload; as=script',
    '</css/style.css>; rel=preload; as=style'
  ].join(', '));

  next();
};

// Database query caching
const queryCache = new Map();
const CACHE_TTL = 60000; // 1 minute

const databaseCaching = (model) => {
  return {
    find: async function(query, options = {}) {
      const key = JSON.stringify({ model, query, options });

      // Check cache
      const cached = queryCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }

      // Execute query
      const result = await this.original.find(query, options);

      // Cache result
      queryCache.set(key, {
        data: result,
        timestamp: Date.now()
      });

      // Clean old cache entries
      if (queryCache.size > 1000) {
        const entries = Array.from(queryCache.entries());
        const now = Date.now();
        entries.forEach(([k, v]) => {
          if (now - v.timestamp > CACHE_TTL) {
            queryCache.delete(k);
          }
        });
      }

      return result;
    }
  };
};

// API response optimization
const apiOptimization = (req, res, next) => {
  // Add pagination metadata
  res.paginate = (data, total, page = 1, limit = 10) => {
    return {
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  };

  // Optimized JSON response
  const originalJson = res.json;
  res.json = function(data) {
    // Remove null and undefined values to reduce payload
    const cleaned = JSON.parse(JSON.stringify(data, (key, value) =>
      value === null || value === undefined ? undefined : value
    ));

    originalJson.call(this, cleaned);
  };

  next();
};

// Lazy loading middleware
const lazyLoading = (req, res, next) => {
  // Add lazy loading helper
  req.lazyLoad = (promise) => {
    return new Promise((resolve) => {
      // Defer execution
      process.nextTick(() => {
        promise.then(resolve).catch(err => {
          console.error('Lazy load error:', err);
          resolve(null);
        });
      });
    });
  };

  next();
};

// Performance monitoring
const performanceMonitoring = {
  slowQueryThreshold: 100, // ms
  slowApiThreshold: 500, // ms

  logSlowQuery: (query, time) => {
    if (time > performanceMonitoring.slowQueryThreshold) {
      console.warn(`Slow query detected (${time}ms):`, query);
    }
  },

  logSlowApi: (endpoint, time) => {
    if (time > performanceMonitoring.slowApiThreshold) {
      console.warn(`Slow API response (${time}ms):`, endpoint);
    }
  }
};

// Export all optimization middleware
module.exports = {
  responseTime,
  compressionConfig,
  etagMiddleware,
  queryOptimization,
  staticCacheHeaders,
  resourceHints,
  databaseCaching,
  apiOptimization,
  lazyLoading,
  performanceMonitoring,
  connectionPooling,

  // Combined middleware stack
  performanceStack: [
    responseTime,
    compressionConfig,
    etagMiddleware,
    queryOptimization,
    staticCacheHeaders,
    apiOptimization,
    lazyLoading
  ]
};