const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');
const securityConfig = require('../config/security');

// Rate limiting configurations for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  // Return passthrough middleware if rate limiting is disabled
  if (!securityConfig.rateLimiting.enabled) {
    return (req, res, next) => next();
  }

  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limiters for different operations
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later.'
  ),

  // Strict rate limit for auth endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Too many authentication attempts, please try again later.'
  ),

  // Rate limit for data modification
  modify: createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    20, // limit each IP to 20 requests per windowMs
    'Too many modification requests, please slow down.'
  ),

  // Rate limit for file uploads
  upload: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // limit each IP to 10 uploads per hour
    'Upload limit exceeded, please try again later.'
  )
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Sanitize all string inputs
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Remove any HTML tags and trim
        obj[key] = validator.escape(obj[key]).trim();

        // Additional validation for specific fields
        if (key.includes('email') && obj[key]) {
          if (!validator.isEmail(obj[key])) {
            delete obj[key];
          }
        }

        if (key.includes('url') && obj[key]) {
          if (!validator.isURL(obj[key])) {
            delete obj[key];
          }
        }

        // Limit string length
        if (obj[key].length > 1000) {
          obj[key] = obj[key].substring(0, 1000);
        }
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    });

    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// CSRF protection
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API endpoints that use JWT
  if (req.path.startsWith('/api/') && req.headers.authorization) {
    return next();
  }

  // For web routes, check CSRF token
  const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: false, // ปิด CSP ใน middleware นี้ - ใช้ CSP ใน server.js แทน
  /*
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  */
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// SQL Injection prevention for raw queries
const preventSQLInjection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|\/\*|\*\/|xp_|sp_)/gi,
    /(\bor\b\s*\d+\s*=\s*\d+)/gi,
    /(\band\b\s*\d+\s*=\s*\d+)/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return false;
        }
      }
    }
    return true;
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return true;

    for (const key in obj) {
      if (!checkValue(obj[key])) return false;
      if (typeof obj[key] === 'object' && !checkObject(obj[key])) return false;
    }
    return true;
  };

  if (!checkObject(req.body) || !checkObject(req.query) || !checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
  if (!req.files) return next();

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  for (const file of Object.values(req.files)) {
    const ext = path.extname(file.name).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    if (file.size > maxFileSize) {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }

    // Check file content matches extension
    const fileType = file.mimetype.split('/')[0];
    if (ext.match(/\.(jpg|jpeg|png)$/) && fileType !== 'image') {
      return res.status(400).json({ error: 'File content does not match extension' });
    }
  }

  next();
};

module.exports = {
  securityHeaders,
  rateLimiters,
  validateInput,
  csrfProtection,
  preventSQLInjection,
  fileUploadSecurity,
  mongoSanitize: mongoSanitize(),
  xssClean: xss(),
  hpp: hpp()
};
