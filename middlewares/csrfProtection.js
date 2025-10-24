// CSRF Protection Middleware
const csrf = require('csurf');
const crypto = require('crypto');

// CSRF middleware with cookie-based tokens
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  }
});

// Generate CSRF token for forms
const generateCSRFToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

// Custom error handler for CSRF token errors
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  // Log CSRF attack attempts
  console.error('⚠️ CSRF token validation failed:', {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    timestamp: new Date().toISOString()
  });

  res.status(403).json({
    success: false,
    error: 'Invalid CSRF token',
    message: 'Security validation failed. Please refresh the page and try again.'
  });
};

// Skip CSRF for certain routes (APIs that use JWT instead)
const conditionalCSRF = (req, res, next) => {
  // Skip CSRF for API routes that use JWT authentication
  const skipPaths = [
    '/api/installment',
    '/api/unified-customer',
    '/api/auth/refresh',
    '/health',
    '/status'
  ];

  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));

  if (shouldSkip || req.method === 'GET') {
    return next();
  }

  return csrfProtection(req, res, next);
};

module.exports = {
  csrfProtection,
  generateCSRFToken,
  csrfErrorHandler,
  conditionalCSRF
};