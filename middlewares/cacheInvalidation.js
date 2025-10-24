const { cacheService } = require('../config/cache');

/**
 * Cache Invalidation Middleware
 * ใช้สำหรับล้าง cache เมื่อมีการ update/delete/create
 */
const cacheInvalidation = {
  /**
   * Invalidate cache patterns based on route
   */
  invalidateByRoute: (patterns = []) => {
    return async (req, res, next) => {
      // Store original json method
      const originalJson = res.json;

      res.json = function(data) {
        // Only invalidate on successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Default patterns based on route
          const defaultPatterns = [
            `route:${req.baseUrl}*`, // Invalidate all routes in this module
            'route:*/dashboard*',     // Invalidate all dashboards
            'route:*/stats*',         // Invalidate all statistics
            'route:*/summary*',       // Invalidate all summaries
            'route:*/report*'         // Invalidate all reports
          ];

          // Combine with custom patterns
          const allPatterns = [...defaultPatterns, ...patterns];

          // Invalidate each pattern
          allPatterns.forEach(pattern => {
            cacheService.invalidatePattern(pattern).catch(err => {
              console.error(`Failed to invalidate cache pattern: ${pattern}`, err);
            });
          });

          console.log(`🗑️  Cache invalidated for: ${allPatterns.join(', ')}`);
        }

        // Call original method
        originalJson.call(this, data);
      };

      next();
    };
  },

  /**
   * Smart invalidation based on HTTP method and route
   */
  smart: () => {
    return async (req, res, next) => {
      // Only for write operations
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
      }

      const originalJson = res.json;

      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const route = req.originalUrl || req.url;
          const segments = route.split('/').filter(Boolean);

          const patterns = [];

          // Invalidate based on route segments
          if (segments.length >= 2) {
            const module = segments[1]; // e.g., 'products', 'branches'

            patterns.push(
              `route:*/${module}*`,     // All routes for this module
              `route:*/dashboard*`,      // All dashboards
              `route:*/summary*`,        // All summaries
              `route:*/stats*`,          // All statistics
              `route:*/list*`,           // All list endpoints
              `route:*/search*`          // All search endpoints
            );

            // Special patterns for common modules
            if (['product', 'branch', 'supplier', 'category'].includes(module)) {
              patterns.push('route:*/master*'); // Master data endpoints
            }

            if (['sale', 'order', 'invoice', 'payment'].includes(module)) {
              patterns.push('route:*/financial*'); // Financial endpoints
            }

            if (['stock', 'inventory', 'branch-stock'].includes(module)) {
              patterns.push('route:*/inventory*'); // Inventory endpoints
            }
          }

          // Execute invalidation
          patterns.forEach(pattern => {
            cacheService.invalidatePattern(pattern).catch(err => {
              console.error(`Failed to invalidate cache pattern: ${pattern}`, err);
            });
          });

          if (patterns.length > 0) {
            console.log(`🗑️  Smart cache invalidation: ${patterns.length} patterns`);
          }
        }

        originalJson.call(this, data);
      };

      next();
    };
  },

  /**
   * Invalidate specific module cache
   */
  module: (moduleName) => {
    return cacheInvalidation.invalidateByRoute([
      `route:*/${moduleName}*`,
      `route:*${moduleName}*`
    ]);
  },

  /**
   * Invalidate all dashboards
   */
  dashboards: () => {
    return cacheInvalidation.invalidateByRoute([
      'route:*/dashboard*',
      'route:*/stats*',
      'route:*/summary*',
      'route:*/analytics*'
    ]);
  },

  /**
   * Invalidate all master data
   */
  masterData: () => {
    return cacheInvalidation.invalidateByRoute([
      'route:*/branch*',
      'route:*/product*',
      'route:*/category*',
      'route:*/supplier*',
      'route:*/user*',
      'route:*/chart-of-accounts*'
    ]);
  },

  /**
   * Invalidate all financial data
   */
  financial: () => {
    return cacheInvalidation.invalidateByRoute([
      'route:*/income*',
      'route:*/expense*',
      'route:*/payment*',
      'route:*/invoice*',
      'route:*/billing*',
      'route:*/contract*'
    ]);
  },

  /**
   * Invalidate all inventory data
   */
  inventory: () => {
    return cacheInvalidation.invalidateByRoute([
      'route:*/stock*',
      'route:*/inventory*',
      'route:*/branch-stock*',
      'route:*/product*'
    ]);
  }
};

module.exports = cacheInvalidation;