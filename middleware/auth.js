/**
 * Authentication Middleware - Secure authentication system
 * ระบบการยืนยันตัวตนแบบปลอดภัย
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const coreAuthMiddleware = require('../middlewares/authMiddleware');

// Token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();

// Generate secure tokens
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    issuer: 'my-accounting-app',
    audience: 'api-users'
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, tokenType: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
      issuer: 'my-accounting-app',
      audience: 'api-users'
    }
  );

  return { accessToken, refreshToken };
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'my-accounting-app',
      audience: 'api-users'
    });
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'my-accounting-app',
      audience: 'api-users'
    });
  } catch (error) {
    throw new Error(`Refresh token verification failed: ${error.message}`);
  }
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate secure session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบ',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Test mode - allow specific test tokens in development
    if (process.env.NODE_ENV === 'development' && token === 'test_token_12345') {
      req.user = {
        userId: 'test_user_123',
        username: 'test_user',
        name: 'Test User',
        role: 'admin',
        branchCode: '00000',
        permissions: ['*'],
        sessionId: 'test_session'
      };
      console.log('✅ Test token authenticated successfully');
      return next();
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token ไม่ถูกต้อง',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      branchCode: decoded.branchCode,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId
    };

    // Log successful authentication
    console.log(`✅ User authenticated: ${decoded.username} (${decoded.role})`);

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
      code: 'INVALID_TOKEN'
    });
  }
};

// Authorization middleware (check roles and permissions)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบ',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if user role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      console.warn(`🚫 Access denied for ${req.user.username}: Required roles: ${allowedRoles.join(', ')}, User role: ${req.user.role}`);

      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

// Permission-based authorization
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบ',
        code: 'UNAUTHORIZED'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      console.warn(`🚫 Permission denied for ${req.user.username}: Required: ${permission}`);

      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ในการดำเนินการนี้',
        code: 'PERMISSION_DENIED'
      });
    }

    next();
  };
};

// Branch access control
const requireBranchAccess = (req, res, next) => {
  const requestedBranch = req.params.branchCode || req.query.branchCode || req.body.branchCode;

  if (!requestedBranch) {
    return next(); // No branch specified, continue
  }

  // Admin can access all branches
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user has access to the requested branch
  if (req.user.branchCode !== requestedBranch) {
    console.warn(`🚫 Branch access denied for ${req.user.username}: Requested: ${requestedBranch}, User branch: ${req.user.branchCode}`);

    return res.status(403).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลสาขานี้',
      code: 'BRANCH_ACCESS_DENIED'
    });
  }

  next();
};

// Optional authentication (for public endpoints that can benefit from user context)
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (!tokenBlacklist.has(token)) {
        try {
          const decoded = verifyAccessToken(token);
          req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            branchCode: decoded.branchCode,
            permissions: decoded.permissions || [],
            sessionId: decoded.sessionId
          };
        } catch (error) {
          // Ignore authentication errors for optional auth
          console.log('Optional auth failed:', error.message);
        }
      }
    }
  } catch (error) {
    // Ignore all errors for optional auth
  }

  next();
}

// Logout (blacklist token)
const logout = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    tokenBlacklist.add(token);
    console.log(`🚪 Token blacklisted for logout: ${req.user?.username}`);
  }

  next();
};

// Clean expired tokens from blacklist (run periodically)
const cleanupBlacklist = () => {
  const now = Math.floor(Date.now() / 1000);

  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp < now) {
        tokenBlacklist.delete(token);
      }
    } catch (error) {
      // Remove invalid tokens
      tokenBlacklist.delete(token);
    }
  }

  console.log(`🧹 Cleaned token blacklist. Current size: ${tokenBlacklist.size}`);
};

// Run cleanup every hour
setInterval(cleanupBlacklist, 60 * 60 * 1000);

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Rate limiting for authentication endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'พยายามเข้าสู่ระบบเยอะเกินไป กรุณารอ 15 นาที',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateSessionId,
  authenticate,
  authorize,
  requirePermission,
  requireBranchAccess,
  optionalAuth,
  logout,
  cleanupBlacklist,
  generateCSRFToken,
  authRateLimit,
  tokenBlacklist,
  authMiddleware: coreAuthMiddleware
};


