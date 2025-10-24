// Centralized Input Validation Middleware using Joi
const Joi = require('joi');
const xss = require('xss');
const validator = require('validator');

// Custom sanitization functions
const sanitizers = {
  // Remove HTML tags and scripts
  sanitizeHTML: (value) => {
    if (typeof value !== 'string') return value;
    return xss(value, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  },

  // Sanitize for MongoDB injection
  sanitizeMongo: (value) => {
    if (typeof value !== 'string') return value;
    // Remove MongoDB operators
    return value.replace(/[$]/g, '');
  },

  // Normalize email
  sanitizeEmail: (value) => {
    if (!value) return value;
    return validator.normalizeEmail(value, {
      gmail_remove_dots: false,
      gmail_remove_subaddress: false
    });
  },

  // Sanitize file names
  sanitizeFilename: (value) => {
    if (!value) return value;
    return value.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
};

// Common validation schemas
const schemas = {
  // User authentication
  login: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).max(128).required(),
    rememberMe: Joi.boolean().optional()
  }),

  // User registration
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required()
  }),

  // Customer data
  customer: Joi.object({
    customerType: Joi.string().valid('individual', 'corporate').required(),
    nationalId: Joi.string().length(13).pattern(/^\d+$/).required(),
    individual: Joi.when('customerType', {
      is: 'individual',
      then: Joi.object({
        firstName: Joi.string().min(1).max(50).required(),
        lastName: Joi.string().min(1).max(50).required(),
        phone: Joi.string().pattern(/^0\d{9}$/).required(),
        email: Joi.string().email().optional(),
        idCard: Joi.string().length(13).pattern(/^\d+$/).required(),
        address: Joi.object({
          houseNo: Joi.string().max(20).required(),
          road: Joi.string().max(100).optional(),
          district: Joi.string().max(50).required(),
          province: Joi.string().max(50).required(),
          zipcode: Joi.string().length(5).pattern(/^\d+$/).required()
        }).optional()
      })
    }),
    corporate: Joi.when('customerType', {
      is: 'corporate',
      then: Joi.object({
        companyName: Joi.string().min(1).max(100).required(),
        taxId: Joi.string().length(13).pattern(/^\d+$/).required(),
        phone: Joi.string().pattern(/^0\d{9}$/).required(),
        email: Joi.string().email().optional()
      })
    })
  }),

  // Product/Order
  order: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).max(999).required(),
        price: Joi.number().positive().max(9999999).required()
      })
    ).min(1).required(),
    paymentMethod: Joi.string().valid('cash', 'credit', 'transfer', 'installment').required(),
    total: Joi.number().positive().required()
  }),

  // MongoDB ObjectId
  objectId: Joi.string().hex().length(24),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // File upload
  fileUpload: Joi.object({
    mimetype: Joi.string().valid(
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ).required(),
    size: Joi.number().max(5 * 1024 * 1024).required() // 5MB max
  })
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return async (req, res, next) => {
    try {
      // Get data to validate
      const dataToValidate = req[property];

      // Validate against schema
      const validated = await schema.validateAsync(dataToValidate, {
        abortEarly: false, // Return all errors
        stripUnknown: true, // Remove unknown keys
        convert: true // Type conversion
      });

      // Apply sanitization based on field types
      const sanitized = sanitizeData(validated);

      // Replace request data with validated & sanitized data
      req[property] = sanitized;

      next();
    } catch (error) {
      if (error.isJoi) {
        // Format validation errors
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      next(error);
    }
  };
};

// Recursive data sanitization
function sanitizeData(data) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Apply appropriate sanitization based on field name
        if (key.includes('email') || key.includes('Email')) {
          sanitized[key] = sanitizers.sanitizeEmail(value);
        } else if (key.includes('html') || key.includes('Html')) {
          sanitized[key] = sanitizers.sanitizeHTML(value);
        } else if (key === '_id' || key.includes('Id')) {
          sanitized[key] = sanitizers.sanitizeMongo(value);
        } else {
          // Default: basic XSS protection
          sanitized[key] = sanitizers.sanitizeHTML(value);
        }
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

// SQL Injection protection for raw queries (if any)
const preventSQLInjection = (req, res, next) => {
  const suspicious = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP',
    'UNION', 'WHERE', 'ORDER BY', '--', '/*', '*/',
    'xp_', 'sp_', 'exec', 'execute'
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      const upper = value.toUpperCase();
      for (const pattern of suspicious) {
        if (upper.includes(pattern)) {
          console.warn('⚠️ Potential SQL injection attempt:', {
            ip: req.ip,
            path: req.path,
            value: value.substring(0, 100)
          });
          return false;
        }
      }
    }
    return true;
  };

  // Check all input sources
  const sources = [req.body, req.query, req.params];
  for (const source of sources) {
    if (source) {
      const values = Object.values(source);
      for (const value of values) {
        if (!checkValue(value)) {
          return res.status(403).json({
            success: false,
            error: 'Security validation failed'
          });
        }
      }
    }
  }

  next();
};

module.exports = {
  validate,
  schemas,
  sanitizers,
  preventSQLInjection
};