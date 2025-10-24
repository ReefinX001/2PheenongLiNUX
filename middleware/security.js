/**
 * Security Middleware - Comprehensive security measures
 * ระบบรักษาความปลอดภัยแบบครบครัน
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: (req) => {
      // Skip rate limiting for trusted IPs (if configured)
      const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
      return trustedIPs.includes(req.ip);
    }
  });
};

// Different rate limits for different endpoints
const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // requests per window
    'คำขอเยอะเกินไป กรุณารอ 15 นาที'
  ),

  // Strict rate limit for authentication
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // requests per window
    'พยายามเข้าสู่ระบบเยอะเกินไป กรุณารอ 15 นาที',
    false // don't skip successful requests for auth
  ),

  // Moderate rate limit for creating data
  create: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    20, // requests per window
    'สร้างข้อมูลเยอะเกินไป กรุณารอ 5 นาที'
  ),

  // Lenient rate limit for reading data
  read: createRateLimit(
    1 * 60 * 1000, // 1 minute
    60, // requests per window
    'อ่านข้อมูลเยอะเกินไป กรุณารอ 1 นาที'
  )
};

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Security headers with Helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com'
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline scripts - should be minimized in production
        'https://cdn.tailwindcss.com',
        'https://www.gstatic.com',
        'https://cdnjs.cloudflare.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'https://*.firebaseapp.com',
        'https://*.googleapis.com',
        'wss://localhost:*', // For Socket.IO in development
        'ws://localhost:*'   // For Socket.IO in development
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disabled for compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// XSS Protection
const xssProtection = xss();

// NoSQL Injection Protection
const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`🔒 Potential NoSQL injection blocked: ${key} from IP: ${req.ip}`);
  }
});

// HTTP Parameter Pollution Protection
const parameterPollutionProtection = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'filter'] // Allow arrays for these parameters
});

// IP Whitelist middleware (for admin endpoints)
const ipWhitelist = (allowedIPs) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (allowedIPs.includes(clientIP)) {
      return next();
    }

    console.warn(`🚫 Blocked access from unauthorized IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      message: 'ไม่อนุญาตให้เข้าถึงจาก IP นี้'
    });
  };
};

// Request size limiting
const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = parseInt(limit.replace(/[^0-9]/g, '')) * (limit.includes('mb') ? 1024 * 1024 : 1024);

    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'ข้อมูลที่ส่งมาใหญ่เกินไป'
      });
    }

    next();
  };
};

// Suspicious activity detection
const suspiciousActivityDetector = () => {
  const suspiciousPatterns = [
    /(<script|javascript:|data:text\/html)/i, // XSS patterns
    /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection patterns
    /(\.\.\/)/, // Directory traversal
    /(eval|exec|system|shell_exec)/i, // Command injection patterns
  ];

  return (req, res, next) => {
    const checkSuspicious = (obj, path = '') => {
      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'string') {
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
              console.warn(`🚨 Suspicious activity detected: ${pattern.source} in ${currentPath} from IP: ${req.ip}`);

              // Log to security monitoring system
              // You can integrate with external logging services here

              return res.status(400).json({
                success: false,
                message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง'
              });
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          const result = checkSuspicious(value, currentPath);
          if (result) return result;
        }
      }
    };

    // Check body, params, and query
    if (req.body) {
      const result = checkSuspicious(req.body);
      if (result) return result;
    }

    if (req.params) {
      const result = checkSuspicious(req.params);
      if (result) return result;
    }

    if (req.query) {
      const result = checkSuspicious(req.query);
      if (result) return result;
    }

    next();
  };
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      contentLength: req.get('Content-Length') || '0'
    };

    // Log suspicious requests
    if (res.statusCode >= 400) {
      console.warn('🔍 Security Log:', JSON.stringify(logData));
    }

    // You can integrate with external logging services here
  });

  next();
};

// Combine all security middleware
const applySecurityMiddleware = (app) => {
  // Basic security headers
  app.use(securityHeaders);

  // Request logging
  app.use(securityLogger);

  // Body size limiting
  app.use(requestSizeLimit('10mb'));

  // XSS protection
  app.use(xssProtection);

  // NoSQL injection protection
  app.use(mongoSanitization);

  // Parameter pollution protection
  app.use(parameterPollutionProtection);

  // Suspicious activity detection
  app.use(suspiciousActivityDetector());

  console.log('🛡️ Security middleware applied successfully');
};

module.exports = {
  rateLimits,
  csrfProtection,
  securityHeaders,
  xssProtection,
  mongoSanitization,
  parameterPollutionProtection,
  ipWhitelist,
  requestSizeLimit,
  suspiciousActivityDetector,
  securityLogger,
  applySecurityMiddleware
};