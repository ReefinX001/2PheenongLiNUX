/**
 * Error Handling System - Centralized error management
 * ระบบจัดการข้อผิดพลาดแบบรวมศูนย์
 */

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'กรุณาเข้าสู่ระบบ') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'ไม่พบข้อมูลที่ต้องการ') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'ข้อมูลขัดแย้งกัน') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'ส่งคำขอเร็วเกินไป กรุณารอสักครู่') {
    super(message, 429, 'RATE_LIMITED');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'เกิดข้อผิดพลาดจากฐานข้อมูล') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'เกิดข้อผิดพลาดจากบริการภายนอก', service = 'unknown') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

// Error response formatter
const formatErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    message: error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: error.timestamp || new Date().toISOString()
  };

  // Add validation errors if present
  if (error.errors && Object.keys(error.errors).length > 0) {
    response.errors = error.errors;
  }

  // Add service name for external service errors
  if (error.service) {
    response.service = error.service;
  }

  // Include stack trace in development
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

// Log error details
const logError = (error, req = null, context = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    context,
    stack: error.stack
  };

  // Add request information if available
  if (req) {
    logData.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      username: req.user?.username,
      sessionId: req.user?.sessionId
    };

    // Add request body for POST/PUT/PATCH (but sanitize sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const sanitizedBody = sanitizeRequestBody(req.body);
      logData.request.body = sanitizedBody;
    }
  }

  // Log based on error severity
  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2));
  } else {
    console.log('ℹ️ Error:', JSON.stringify(logData, null, 2));
  }

  // In production, you can send logs to external services here
  // Example: sendToLoggingService(logData);
};

// Sanitize request body to remove sensitive information
const sanitizeRequestBody = (body) => {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth',
    'creditCard', 'ssn', 'nationalId', 'pin'
  ];

  const sanitized = JSON.parse(JSON.stringify(body));

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else if (sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        obj[key] = '[REDACTED]';
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

// Handle different types of database errors
const handleDatabaseError = (error) => {
  // MongoDB specific errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    switch (error.code) {
      case 11000:
        const field = Object.keys(error.keyPattern || {})[0];
        return new ConflictError(`ข้อมูล${field}นี้มีอยู่แล้ว`);
      case 16755:
        return new DatabaseError('การเชื่อมต่อฐานข้อมูลล้มเหลว');
      default:
        return new DatabaseError(error.message);
    }
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = {};
    for (const field in error.errors) {
      errors[field] = error.errors[field].message;
    }
    return new ValidationError('ข้อมูลไม่ถูกต้อง', errors);
  }

  // Express-validator errors
  if (error.statusCode === 400 && error.code === 'VALIDATION_ERROR') {
    return error; // Keep as is, already properly formatted
  }

  // Mongoose cast errors
  if (error.name === 'CastError') {
    return new ValidationError(`ข้อมูล ${error.path} ไม่ถูกต้อง`);
  }

  return new DatabaseError(error.message);
};

// Handle JWT errors
const handleJWTError = (error) => {
  switch (error.name) {
    case 'JsonWebTokenError':
      return new AuthenticationError('Token ไม่ถูกต้อง');
    case 'TokenExpiredError':
      return new AuthenticationError('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    case 'NotBeforeError':
      return new AuthenticationError('Token ยังไม่สามารถใช้งานได้');
    default:
      return new AuthenticationError('การยืนยันตัวตนล้มเหลว');
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert non-operational errors to operational errors
  if (!error.isOperational) {
    // Handle specific error types
    if (error.name?.includes('Mongo') || error.name === 'ValidationError' || error.name === 'CastError') {
      error = handleDatabaseError(error);
    } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
      error = handleJWTError(error);
    } else {
      // Generic internal server error
      error = new AppError(
        process.env.NODE_ENV === 'production'
          ? 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์'
          : error.message,
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  // Log the error
  logError(error, req, {
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString()
  });

  // Send error response
  const includeStack = process.env.NODE_ENV === 'development';
  const errorResponse = formatErrorResponse(error, includeStack);

  res.status(error.statusCode || 500).json(errorResponse);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`ไม่พบ endpoint: ${req.method} ${req.originalUrl}`);
  next(error);
};

// Graceful shutdown on unhandled errors
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    logError(error, null, { type: 'uncaughtException' });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    logError(reason, null, { type: 'unhandledRejection' });
    process.exit(1);
  });
};

// Health check endpoint error handler
const healthCheckError = (service, error) => {
  return new ExternalServiceError(`บริการ ${service} ไม่สามารถเข้าถึงได้`, service);
};

module.exports = {
  // Error Classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,

  // Error Handling Functions
  errorHandler,
  asyncHandler,
  notFoundHandler,
  formatErrorResponse,
  logError,
  sanitizeRequestBody,
  handleDatabaseError,
  handleJWTError,
  handleUncaughtException,
  healthCheckError
};