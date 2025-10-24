const AuditLog = require('../models/Account/AuditLog');

// Middleware to track all activities
const auditLogger = (resource) => {
  return async (req, res, next) => {
    // Store start time for response time calculation
    req._startTime = Date.now();

    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture response data
    res.send = function(data) {
      res.locals.responseData = data;
      originalSend.call(this, data);
    };

    res.json = function(data) {
      res.locals.responseData = data;
      originalJson.call(this, data);
    };

    // Capture response after it's sent
    res.on('finish', async () => {
      try {
        // Skip logging for certain endpoints
        const skipEndpoints = ['/api/health', '/api/metrics', '/api/logs'];
        if (skipEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint))) {
          return;
        }

        // Determine action based on method
        let action = 'READ';
        switch (req.method) {
          case 'POST':
            action = 'CREATE';
            break;
          case 'PUT':
          case 'PATCH':
            action = 'UPDATE';
            break;
          case 'DELETE':
            action = 'DELETE';
            break;
        }

        // Extract resource ID from URL
        const resourceId = req.params.id || req.params._id ||
                          (res.locals.responseData && res.locals.responseData._id);

        // Log the activity
        await AuditLog.logActivity(req, action, resource, resourceId, {
          status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failed',
          metadata: {
            statusCode: res.statusCode,
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined
          }
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });

    next();
  };
};

// Specific middleware for sensitive operations
const auditSensitiveOperation = (operation) => {
  return async (req, res, next) => {
    req.auditOperation = operation;
    next();
  };
};

// Middleware to track data changes
const trackDataChanges = (Model) => {
  return async (req, res, next) => {
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const id = req.params.id || req.params._id;
        if (id) {
          const originalData = await Model.findById(id).lean();
          req.originalData = originalData;
        }
      } catch (error) {
        console.error('Error fetching original data:', error);
      }
    }
    next();
  };
};

module.exports = {
  auditLogger,
  auditSensitiveOperation,
  trackDataChanges
};
