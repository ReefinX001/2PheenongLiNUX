// Global Error Handling Middleware
const fs = require('fs');
const path = require('path');

// Error logging utility
class ErrorLogger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(errorData) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...errorData
        };

        // Write to error log file
        const logFile = path.join(this.logDir, 'application_errors.log');
        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            fs.appendFileSync(logFile, logLine, 'utf8');
        } catch (logError) {
            console.error('Failed to write to error log:', logError);
        }

        // Also log to console for development
        if (process.env.NODE_ENV === 'development') {
            console.error('🔥 Application Error:', logEntry);
        }
    }
}

const errorLogger = new ErrorLogger();

// Enhanced error categorization
const ErrorTypes = {
    VALIDATION: 'validation',
    DATABASE: 'database',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    FILE_UPLOAD: 'file_upload',
    BUSINESS_LOGIC: 'business_logic',
    EXTERNAL_API: 'external_api',
    SYSTEM: 'system',
    UNKNOWN: 'unknown'
};

// Error classification function
function classifyError(error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return {
            type: ErrorTypes.VALIDATION,
            severity: 'medium',
            userMessage: 'ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'
        };
    }

    if (error.name === 'MongoError' || error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        return {
            type: ErrorTypes.DATABASE,
            severity: 'high',
            userMessage: 'เกิดปัญหาในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง'
        };
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return {
            type: ErrorTypes.AUTHENTICATION,
            severity: 'medium',
            userMessage: 'การยืนยันตัวตนไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
        };
    }

    if (error.name === 'MulterError') {
        return {
            type: ErrorTypes.FILE_UPLOAD,
            severity: 'medium',
            userMessage: 'เกิดปัญหาในการอัพโหลดไฟล์ กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง'
        };
    }

    if (error.code === 11000) {
        return {
            type: ErrorTypes.DATABASE,
            severity: 'medium',
            userMessage: 'ข้อมูลซ้ำ กรุณาตรวจสอบข้อมูลที่กรอก'
        };
    }

    if (error.code === 'ENOENT' || error.code === 'EACCES') {
        return {
            type: ErrorTypes.SYSTEM,
            severity: 'high',
            userMessage: 'เกิดปัญหาในระบบไฟล์ กรุณาติดต่อผู้ดูแลระบบ'
        };
    }

    return {
        type: ErrorTypes.UNKNOWN,
        severity: 'high',
        userMessage: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ'
    };
}

// Request ID generator
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Enhanced error response formatter
function formatErrorResponse(error, req, classification, requestId) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    const response = {
        success: false,
        message: classification.userMessage,
        error: {
            type: classification.type,
            code: error.code || error.name || 'UNKNOWN_ERROR'
        },
        timestamp: new Date().toISOString(),
        requestId: requestId
    };

    // Include additional details in development
    if (isDevelopment) {
        response.debug = {
            message: error.message,
            stack: error.stack,
            name: error.name
        };
    }

    return response;
}

/**
 * Enhanced Global Error Handling Middleware
 * @param {Error} err - ข้อผิดพลาดที่เกิดขึ้น
 * @param {Request} req - ข้อมูล request
 * @param {Response} res - ข้อมูล response
 * @param {Function} next - ฟังก์ชันสำหรับ middleware ถัดไป
 */
function errorHandler(err, req, res, next) {
    // Generate unique request ID
    const requestId = req.id || generateRequestId();

    // Classify the error
    const classification = classifyError(err);

    // Prepare comprehensive error data for logging
    const errorData = {
        requestId,
        error: {
            message: err.message,
            name: err.name,
            code: err.code,
            stack: err.stack
        },
        request: {
            method: req.method,
            path: req.path,
            query: req.query,
            params: req.params,
            headers: {
                'user-agent': req.get('User-Agent'),
                'content-type': req.get('Content-Type'),
                'origin': req.get('Origin')
            },
            ip: req.ip || req.connection.remoteAddress
        },
        user: req.user ? {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        } : null,
        classification: classification,
        timestamp: new Date().toISOString()
    };

    // Log the error
    errorLogger.log(errorData);

    // Determine HTTP status code
    let statusCode = 500;

    switch (classification.type) {
        case ErrorTypes.VALIDATION:
            statusCode = 400;
            break;
        case ErrorTypes.AUTHENTICATION:
            statusCode = 401;
            break;
        case ErrorTypes.AUTHORIZATION:
            statusCode = 403;
            break;
        case ErrorTypes.DATABASE:
            if (err.code === 11000) {
                statusCode = 409; // Conflict
            } else {
                statusCode = 503; // Service Unavailable
            }
            break;
        case ErrorTypes.FILE_UPLOAD:
            statusCode = 400;
            break;
        case ErrorTypes.BUSINESS_LOGIC:
            statusCode = 422; // Unprocessable Entity
            break;
        case ErrorTypes.EXTERNAL_API:
            statusCode = 502; // Bad Gateway
            break;
        default:
            statusCode = err.status || err.statusCode || 500;
    }

    // Format and send error response
    const errorResponse = formatErrorResponse(err, req, classification, requestId);

    // Set appropriate headers
    res.set({
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
    });

    res.status(statusCode).json(errorResponse);

    // Emit error event for monitoring systems
    if (req.app && typeof req.app.emit === 'function') {
        req.app.emit('applicationError', errorData);
    }
}

// 404 Not Found handler
const notFoundHandler = (req, res, next) => {
    const requestId = req.id || generateRequestId();

    const notFoundResponse = {
        success: false,
        message: 'เส้นทางที่ร้องขอไม่พบ',
        error: {
            type: 'not_found',
            code: 'ROUTE_NOT_FOUND'
        },
        timestamp: new Date().toISOString(),
        requestId: requestId
    };

    // Log 404 errors
    errorLogger.log({
        requestId,
        error: {
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            name: 'NotFoundError'
        },
        request: {
            method: req.method,
            path: req.path,
            query: req.query
        },
        classification: {
            type: 'not_found',
            severity: 'low'
        }
    });

    res.status(404).json(notFoundResponse);
};

// Async wrapper for route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Validation error creator
const createValidationError = (message, field = null) => {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.field = field;
    return error;
};

// Business logic error creator
const createBusinessError = (message, code = 'BUSINESS_LOGIC_ERROR') => {
    const error = new Error(message);
    error.name = 'BusinessLogicError';
    error.code = code;
    return error;
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    const errorData = {
        type: 'unhandled_rejection',
        reason: reason.toString(),
        stack: reason.stack,
        promise: promise.toString(),
        timestamp: new Date().toISOString()
    };

    errorLogger.log(errorData);

    console.error('🚨 Unhandled Promise Rejection:', reason);

    // Graceful shutdown in production
    if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Shutting down gracefully due to unhandled promise rejection...');
        process.exit(1);
    }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    const errorData = {
        type: 'uncaught_exception',
        error: {
            message: error.message,
            name: error.name,
            stack: error.stack
        },
        timestamp: new Date().toISOString()
    };

    errorLogger.log(errorData);

    console.error('🚨 Uncaught Exception:', error);

    // Graceful shutdown
    console.log('🔄 Shutting down gracefully due to uncaught exception...');
    process.exit(1);
});

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    createValidationError,
    createBusinessError,
    ErrorTypes,
    classifyError,
    ErrorLogger
};
