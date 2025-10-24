// Enhanced Security Middleware Suite
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const toobusy = require('toobusy-js');
const crypto = require('crypto');

// Advanced Security Headers
const securityHeaders = helmet({
  contentSecurityPolicy: false, // ปิด CSP ใน middleware นี้ - ใช้ CSP ใน server.js แทน
  /*
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Will be replaced with nonces
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
        "https://cdn.tailwindcss.com",
        "https://www.gstatic.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.tailwindcss.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:"
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "data:",
        "https://api.github.com",
        "https://www.gstatic.com",
        "https://cdn.jsdelivr.net", // ← เพิ่ม jsDelivr CDN for libraries and source maps
        "https://cdn.jsdelivr.net/npm/", // ← เพิ่มสำหรับ npm packages และ source maps
        "https://*.jsdelivr.net", // ← เพิ่ม wildcard สำหรับ subdomains
        "https://cdnjs.cloudflare.com", // ← เพิ่ม Cloudflare CDN for libraries and source maps
        "https://*.cloudflare.com", // ← เพิ่ม wildcard สำหรับ Cloudflare subdomains
        "https://cdn.socket.io",
        "wss://cdn.socket.io",
        "wss:",
        "ws:",
        "ws://localhost:*",
        "ws://127.0.0.1:*",
        "ws://192.168.*:*",
        "ws://10.*:*",
        "ws://172.16.*:*"
      ],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      blockAllMixedContent: []
    }
  },
  */
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

// MongoDB Injection Prevention
const mongoInjectionPrevention = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ MongoDB injection attempt blocked from ${req.ip} on key ${key}`);
  }
});

// HTTP Parameter Pollution Prevention
const parameterPollutionPrevention = hpp({
  whitelist: ['sort', 'filter', 'page', 'limit'] // Allow these to be arrays
});

// Server Overload Protection
const serverOverloadProtection = (req, res, next) => {
  if (toobusy()) {
    console.warn('⚠️ Server too busy, rejecting request');
    res.status(503).json({
      success: false,
      error: 'Server too busy',
      message: 'The server is currently overloaded. Please try again later.'
    });
  } else {
    next();
  }
};

// Request ID Generation for tracking
const requestIdGenerator = (req, res, next) => {
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
};

// Security Event Logger
const securityLogger = {
  log: (event, details) => {
    const log = {
      timestamp: new Date().toISOString(),
      event,
      ...details,
      environment: process.env.NODE_ENV
    };

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (e.g., Datadog, New Relic, etc.)
      console.log('[SECURITY]', JSON.stringify(log));
    } else {
      console.log('[SECURITY]', log);
    }
  },

  suspiciousActivity: (req, reason) => {
    securityLogger.log('SUSPICIOUS_ACTIVITY', {
      reason,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      userId: req.user?.userId
    });
  },

  authFailure: (req, reason) => {
    securityLogger.log('AUTH_FAILURE', {
      reason,
      ip: req.ip,
      username: req.body?.username,
      path: req.path
    });
  },

  accessDenied: (req, resource) => {
    securityLogger.log('ACCESS_DENIED', {
      resource,
      ip: req.ip,
      userId: req.user?.userId,
      path: req.path
    });
  }
};

// IP-based Rate Limiting with Redis
const createAdvancedRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
      // Use combination of IP and user ID if authenticated
      return req.user ? `${req.ip}-${req.user.userId}` : req.ip;
    },
    handler: (req, res) => {
      securityLogger.suspiciousActivity(req, 'RATE_LIMIT_EXCEEDED');
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: options.message || 'Please try again later',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };

  return { ...defaults, ...options };
};

// Content Type Validation
const contentTypeValidation = (req, res, next) => {
  // Skip for GET requests
  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  const contentType = req.get('content-type');
  const allowedTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ];

  if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
    return res.status(415).json({
      success: false,
      error: 'Unsupported Media Type',
      message: 'Invalid content type'
    });
  }

  next();
};

// Payload Size Limiting (more strict than default)
const payloadSizeLimit = {
  json: '1mb',
  urlencoded: '1mb',
  raw: '1mb',
  text: '1mb'
};

// Security Headers for API Responses
const apiSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// Honeypot Endpoints (trap for attackers)
const honeypot = (req, res, next) => {
  const honeypotPaths = [
    '/admin.php',
    '/wp-admin',
    '/.env',
    '/config.json',
    '/api/v1/admin',
    '/phpmyadmin'
  ];

  if (honeypotPaths.includes(req.path)) {
    securityLogger.suspiciousActivity(req, `HONEYPOT_TRIGGERED: ${req.path}`);

    // Delay response to slow down attackers
    setTimeout(() => {
      res.status(404).send('Not found');
    }, 5000);

    return;
  }

  next();
};

// Trusted Proxy Configuration
const trustedProxyConfig = (app) => {
  // Configure trusted proxies for accurate IP detection
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
  } else {
    app.set('trust proxy', 'loopback'); // Trust localhost only
  }
};

module.exports = {
  securityHeaders,
  mongoInjectionPrevention,
  parameterPollutionPrevention,
  serverOverloadProtection,
  requestIdGenerator,
  securityLogger,
  createAdvancedRateLimiter,
  contentTypeValidation,
  payloadSizeLimit,
  apiSecurityHeaders,
  honeypot,
  trustedProxyConfig
};