const AuditLog = require('../models/Account/AuditLog');
const validator = require('validator');
const helmet = require('helmet');
const securityConfig = require('../config/security');

// Stock-specific rate limiters
let stockRateLimiters = {
    // Default passthrough middleware when rate limiting is disabled
    general: (req, res, next) => next(),
    critical: (req, res, next) => next(),
    modify: (req, res, next) => next()
};

// Only create rate limiters if enabled
if (securityConfig.rateLimiting.enabled) {
    const rateLimit = require('express-rate-limit');

    stockRateLimiters = {
        // General stock operations
        general: rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many stock requests, please try again later.',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
        }),

        // Critical stock operations (transfers, approvals)
        critical: rateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 20, // limit each IP to 20 requests per windowMs
            message: {
                error: 'Too many critical stock operations, please slow down.',
                retryAfter: '5 minutes'
            }
        }),

        // Stock creation/modification
        modify: rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 10, // limit each IP to 10 requests per windowMs
            message: {
                error: 'Too many stock modifications, please wait.',
                retryAfter: '1 minute'
            }
        })
    };
}

// Role-based access control for stock operations
const stockRoleAccess = {
    'view': ['stock_manager', 'inventory_staff', 'admin', 'boss', 'branch_manager'],
    'create': ['stock_manager', 'admin', 'boss'],
    'update': ['stock_manager', 'admin', 'boss'],
    'delete': ['admin', 'boss'],
    'approve': ['stock_manager', 'admin', 'boss'],
    'transfer': ['stock_manager', 'admin', 'boss', 'branch_manager'],
    'adjust': ['stock_manager', 'admin', 'boss']
};

// Enhanced authentication check for stock operations
const authenticateStockUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            await logSecurityEvent(req, 'STOCK_ACCESS_NO_TOKEN', {
                endpoint: req.originalUrl,
                method: req.method
            });
            return res.status(401).json({
                success: false,
                message: 'Authentication token required for stock operations'
            });
        }

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require('../models/User/User');
        const user = await User.findById(decoded.id).select('-password');

        if (!user || !user.isActive) {
            await logSecurityEvent(req, 'STOCK_ACCESS_INVALID_USER', {
                userId: decoded.id,
                endpoint: req.originalUrl
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid or inactive user'
            });
        }

        // Check if user has stock access
        const hasStockAccess = stockRoleAccess.view.includes(user.role?.toLowerCase());
        if (!hasStockAccess) {
            await logSecurityEvent(req, 'STOCK_ACCESS_DENIED', {
                userId: user._id,
                userRole: user.role,
                endpoint: req.originalUrl
            });
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions for stock operations'
            });
        }

        req.user = user;
        req.token = token;

        // Log successful access
        await logUserActivity(req, 'STOCK_ACCESS', 'stock_system', null, {
            endpoint: req.originalUrl,
            method: req.method
        });

        next();
    } catch (error) {
        await logSecurityEvent(req, 'STOCK_AUTH_ERROR', {
            error: error.message,
            endpoint: req.originalUrl
        });
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Authorization check for specific stock operations
const authorizeStockOperation = (operation) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role?.toLowerCase();
            const allowedRoles = stockRoleAccess[operation] || [];

            if (!allowedRoles.includes(userRole)) {
                await logSecurityEvent(req, 'STOCK_OPERATION_DENIED', {
                    userId: req.user._id,
                    userRole: userRole,
                    operation: operation,
                    endpoint: req.originalUrl
                });

                return res.status(403).json({
                    success: false,
                    message: `Insufficient permissions for ${operation} operation`
                });
            }

            // Log authorized access
            await logUserActivity(req, 'STOCK_OPERATION_AUTHORIZED', 'stock_system', null, {
                operation: operation,
                endpoint: req.originalUrl
            });

            next();
        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

// Branch-level access control
const enforceBranchAccess = async (req, res, next) => {
    try {
        const userBranch = req.user.branch;
        const userRole = req.user.role?.toLowerCase();

        // Admin and boss can access all branches
        if (['admin', 'boss'].includes(userRole)) {
            return next();
        }

        // For branch-specific operations, ensure user can only access their branch data
        if (req.body.branch && req.body.branch !== userBranch) {
            await logSecurityEvent(req, 'CROSS_BRANCH_ACCESS_ATTEMPT', {
                userId: req.user._id,
                userBranch: userBranch,
                requestedBranch: req.body.branch,
                endpoint: req.originalUrl
            });

            return res.status(403).json({
                success: false,
                message: 'Cannot access data from other branches'
            });
        }

        // Add branch filter to queries for non-admin users
        if (req.method === 'GET' && !req.query.branch) {
            req.query.branch = userBranch;
        }

        next();
    } catch (error) {
        console.error('Branch access control error:', error);
        return res.status(500).json({
            success: false,
            message: 'Branch access check failed'
        });
    }
};

// Input validation for stock operations
const validateStockInput = (req, res, next) => {
    const errors = [];

    // Sanitize all string inputs
    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'string') {
                // Remove HTML tags and dangerous characters
                obj[key] = validator.escape(obj[key]).trim();

                // Limit string length
                if (obj[key].length > 1000) {
                    obj[key] = obj[key].substring(0, 1000);
                }

                // Check for suspicious patterns
                const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /on\w+\s*=/i,
                    /eval\s*\(/i
                ];

                if (suspiciousPatterns.some(pattern => pattern.test(obj[key]))) {
                    errors.push(`Suspicious content detected in field: ${key}`);
                }
            } else if (typeof obj[key] === 'object') {
                obj[key] = sanitizeObject(obj[key]);
            }
        });

        return obj;
    };

    // Sanitize request data
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    // Specific validations for stock operations
    if (req.body.quantity !== undefined) {
        if (!Number.isInteger(Number(req.body.quantity)) || Number(req.body.quantity) < 0) {
            errors.push('Quantity must be a non-negative integer');
        }
        if (Number(req.body.quantity) > 999999) {
            errors.push('Quantity cannot exceed 999,999');
        }
    }

    if (req.body.price !== undefined) {
        if (isNaN(Number(req.body.price)) || Number(req.body.price) < 0) {
            errors.push('Price must be a non-negative number');
        }
        if (Number(req.body.price) > 9999999.99) {
            errors.push('Price cannot exceed 9,999,999.99');
        }
    }

    if (req.body.productId && !validator.isMongoId(req.body.productId)) {
        errors.push('Invalid product ID format');
    }

    if (req.body.branchId && !validator.isMongoId(req.body.branchId)) {
        errors.push('Invalid branch ID format');
    }

    if (errors.length > 0) {
        logSecurityEvent(req, 'STOCK_INPUT_VALIDATION_FAILED', {
            errors: errors,
            requestBody: req.body
        });

        return res.status(400).json({
            success: false,
            message: 'Input validation failed',
            errors: errors
        });
    }

    next();
};

// CSRF protection for stock operations
const stockCSRFProtection = (req, res, next) => {
    // Skip CSRF for GET requests
    if (req.method === 'GET') {
        return next();
    }

    const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        logSecurityEvent(req, 'STOCK_CSRF_VALIDATION_FAILED', {
            hasToken: !!token,
            hasSessionToken: !!sessionToken,
            endpoint: req.originalUrl
        });

        return res.status(403).json({
            success: false,
            message: 'CSRF token validation failed'
        });
    }

    next();
};

// Audit logging middleware for stock operations
const auditStockOperation = async (req, res, next) => {
    // Store original send method
    const originalSend = res.send;
    const startTime = Date.now();

    // Override send method to capture response
    res.send = function(data) {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log the operation
        logUserActivity(req, getActionFromMethod(req.method), 'stock_operation', null, {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: statusCode,
            responseTime: responseTime,
            requestBody: req.method !== 'GET' ? sanitizeForLog(req.body) : undefined,
            query: req.query
        }).catch(error => console.error('Audit logging failed:', error));

        // Call original send method
        originalSend.call(this, data);
    };

    next();
};

// Helper functions
const getActionFromMethod = (method) => {
    const methodMap = {
        'POST': 'CREATE',
        'PUT': 'UPDATE',
        'PATCH': 'UPDATE',
        'DELETE': 'DELETE',
        'GET': 'VIEW'
    };
    return methodMap[method] || 'UNKNOWN';
};

const sanitizeForLog = (obj) => {
    if (!obj) return obj;
    const sanitized = { ...obj };

    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized._csrf;
    delete sanitized.token;

    return sanitized;
};

// Logging functions
const logUserActivity = async (req, action, resource, resourceId, metadata = {}) => {
    try {
        const user = req.user;
        if (!user) return;

        await AuditLog.create({
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            userBranch: user.branch,
            action: action,
            resource: resource,
            resourceId: resourceId,
            method: req.method,
            endpoint: req.originalUrl,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            location: {
                branch: user.branch,
                department: user.department
            },
            status: 'success',
            metadata: metadata
        });
    } catch (error) {
        console.error('User activity logging failed:', error);
    }
};

const logSecurityEvent = async (req, event, details = {}) => {
    try {
        const user = req.user;

        await AuditLog.create({
            userId: user?._id || null,
            userName: user?.name || 'Anonymous',
            userRole: user?.role || 'Unknown',
            userBranch: user?.branch || 'Unknown',
            action: 'SECURITY_EVENT',
            resource: 'security',
            resourceName: event,
            method: req.method,
            endpoint: req.originalUrl,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            status: 'failed',
            metadata: {
                securityEvent: event,
                details: details
            }
        });
    } catch (error) {
        console.error('Security event logging failed:', error);
    }
};

// Security headers for stock pages
const stockSecurityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
            scriptSrc: ["'self'", 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

module.exports = {
    stockRateLimiters,
    authenticateStockUser,
    authorizeStockOperation,
    enforceBranchAccess,
    validateStockInput,
    stockCSRFProtection,
    auditStockOperation,
    stockSecurityHeaders,
    logUserActivity,
    logSecurityEvent
};
