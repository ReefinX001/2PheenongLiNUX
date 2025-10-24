// config/security.js
const crypto = require('crypto');

// Security Configuration
module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || generateSecureKey(),
    refreshSecret: process.env.REFRESH_SECRET || generateSecureKey(),
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || generateSecureKey(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' // CSRF protection
    }
  },

  // Password Policy
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: 12 // Increased from 10 for better security
  },

  // Rate Limiting
  rateLimiting: {
    enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // เพิ่มเป็น 1000 requests ต่อ 15 นาที (จาก 100)
    loginAttempts: {
      maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10, // เพิ่มจาก 5 เป็น 10
      lockoutDuration: process.env.LOGIN_LOCKOUT_DURATION || '15m'
    }
  },

  // IP Security
  ipSecurity: {
    checkIP: process.env.SKIP_IP_CHECK !== 'true',
    trustProxy: true,
    allowedProxies: ['127.0.0.1', '::1'],
    strictMode: process.env.NODE_ENV === 'production'
  },

  // CORS Configuration
  cors: {
    origin: function(origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000'];

      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Security Headers
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // Audit Log
  auditLog: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    sensitiveFields: ['password', 'token', 'refreshToken', 'secret', 'apiKey', 'creditCard']
  }
};

// Helper function to generate secure random keys
function generateSecureKey() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('WARNING: Using auto-generated security key. Please set proper keys in .env file!');
  }
  return crypto.randomBytes(64).toString('hex');
}

// Validate environment configuration
function validateSecurityConfig() {
  const warnings = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'YOUR_SECRET_KEY') {
    warnings.push('JWT_SECRET is not properly configured');
  }

  if (!process.env.REFRESH_SECRET) {
    warnings.push('REFRESH_SECRET is not configured');
  }

  if (!process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET is not configured');
  }

  if (process.env.SKIP_IP_CHECK === 'true') {
    warnings.push('IP checking is disabled - this reduces security');
  }

  if (process.env.NODE_ENV === 'production' && warnings.length > 0) {
    console.error('SECURITY WARNING:', warnings.join(', '));
  }

  return warnings;
}

// Export validation function
module.exports.validateSecurityConfig = validateSecurityConfig;