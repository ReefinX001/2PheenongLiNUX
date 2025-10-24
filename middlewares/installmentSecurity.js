/**
 * Security Middleware for Installment System
 * Includes rate limiting, input validation, and sanitization
 * @version 1.0.0
 */

const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');
const securityConfig = require('../config/security');

// Create rate limiters only if enabled
let financialOperationsLimiter = (req, res, next) => next();
let generalInstallmentLimiter = (req, res, next) => next();

if (securityConfig.rateLimiting.enabled) {
  const rateLimit = require('express-rate-limit');

  // Rate limiter for payment and refund operations (critical financial operations)
  financialOperationsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Max 10 requests per minute per IP
    message: {
      success: false,
      message: 'Too many financial operations requests. Please try again later.',
      retryAfter: '60 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if available, otherwise IP
      return req.user?.id || req.ip;
    }
  });

  // Rate limiter for general installment operations
  generalInstallmentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Max 30 requests per minute per IP
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: '60 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    }
  });
}

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
};

// Recursive function to sanitize object properties
function sanitizeObject(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key].trim());
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

// Validation rules for contract creation/update
const validateContractData = [
  body('planType')
    .isIn(['plan1', 'plan2', 'plan3', 'manual'])
    .withMessage('Invalid plan type'),

  body('branch_code')
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Invalid branch code format'),

  body('customer_info.firstName')
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Zก-๙\s]+$/)
    .withMessage('Invalid first name'),

  body('customer_info.lastName')
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Zก-๙\s]+$/)
    .withMessage('Invalid last name'),

  body('customer_info.phone')
    .isMobilePhone(['th-TH'])
    .withMessage('Invalid Thai phone number'),

  body('customer_info.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  body('downPayment')
    .isFloat({ min: 0, max: 10000000 })
    .withMessage('Down payment must be between 0 and 10,000,000'),

  body('monthlyPayment')
    .isFloat({ min: 100, max: 1000000 })
    .withMessage('Monthly payment must be between 100 and 1,000,000'),

  body('installmentPeriod')
    .isInt({ min: 1, max: 120 })
    .withMessage('Installment period must be between 1 and 120 months'),
];

// Validation rules for payment operations
const validatePaymentData = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('paymentAmount')
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Payment amount must be between 1 and 1,000,000'),

  body('paymentMethod')
    .isIn(['cash', 'transfer', 'check', 'card'])
    .withMessage('Invalid payment method'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation rules for refund operations
const validateRefundData = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('refundAmount')
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Refund amount must be between 1 and 1,000,000'),

  body('refundReason')
    .isLength({ min: 5, max: 200 })
    .withMessage('Refund reason must be between 5 and 200 characters'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'transfer', 'check'])
    .withMessage('Invalid refund payment method')
];

// Validation rules for late payment processing
const validateLatePaymentData = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('penaltyRate')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Penalty rate must be between 0% and 50%')
];

// Validation rules for payment schedule generation
const validatePaymentScheduleData = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('startDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      const now = new Date();
      const minDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
      const maxDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

      if (value < minDate || value > maxDate) {
        throw new Error('Start date must be between 30 days ago and 1 year from now');
      }
      return true;
    }),

  body('monthlyAmount')
    .isFloat({ min: 100, max: 1000000 })
    .withMessage('Monthly amount must be between 100 and 1,000,000'),

  body('installmentPeriod')
    .isInt({ min: 1, max: 120 })
    .withMessage('Installment period must be between 1 and 120'),

  body('interestRate')
    .optional()
    .isFloat({ min: 0, max: 30 })
    .withMessage('Interest rate must be between 0% and 30%')
];

// Validation rules for contract cancellation
const validateCancellationData = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('cancelReason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Cancel reason must be between 10 and 500 characters'),

  body('refundAmount')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Refund amount must be between 0 and 1,000,000')
];

// Handle validation errors middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

// Financial operation audit logger
const auditFinancialOperation = (req, res, next) => {
  const originalSend = res.json;

  res.json = function(data) {
    // Log financial operations for audit trail
    if (req.originalUrl.includes('/payment') ||
        req.originalUrl.includes('/refund') ||
        req.originalUrl.includes('/cancel')) {

      console.log('🔐 Financial Operation Audit:', {
        timestamp: new Date().toISOString(),
        userId: req.user?.id || 'anonymous',
        operation: req.method + ' ' + req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: data.success || false,
        amount: req.body?.paymentAmount || req.body?.refundAmount || null
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

module.exports = {
  financialOperationsLimiter,
  generalInstallmentLimiter,
  sanitizeInput,
  validateContractData,
  validatePaymentData,
  validateRefundData,
  validateLatePaymentData,
  validatePaymentScheduleData,
  validateCancellationData,
  handleValidationErrors,
  securityHeaders,
  auditFinancialOperation
};