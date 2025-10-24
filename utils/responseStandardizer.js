/**
 * API Response Standardization Utility
 * Provides consistent response format across all API endpoints
 * @version 1.0.0
 */

class ResponseStandardizer {

  /**
   * Standard success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {Object} Standardized response
   */
  static success(res, data = null, message = 'Operation completed successfully', statusCode = 200) {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      statusCode,
      ...(message && { message }),
      ...(data !== null && { data })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Standard error response
   * @param {Object} res - Express response object
   * @param {string} error - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} Standardized error response
   */
  static error(res, error = 'An error occurred', statusCode = 400, code = null, details = null) {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode,
      error,
      ...(code && { code }),
      ...(details && { details })
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && details?.stack) {
      response.stack = details.stack;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data items
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   * @returns {Object} Standardized paginated response
   */
  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      message,
      data,
      pagination: {
        page: parseInt(pagination.page) || 1,
        limit: parseInt(pagination.limit) || 10,
        total: parseInt(pagination.total) || 0,
        pages: parseInt(pagination.pages) || 0,
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
    };

    return res.status(200).json(response);
  }

  /**
   * Validation error response
   * @param {Object} res - Express response object
   * @param {Array|Object} validationErrors - Validation errors
   * @returns {Object} Standardized validation error response
   */
  static validationError(res, validationErrors) {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: 422,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      validationErrors: Array.isArray(validationErrors) ? validationErrors : [validationErrors]
    };

    return res.status(422).json(response);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource that was not found
   * @returns {Object} Standardized not found response
   */
  static notFound(res, resource = 'Resource') {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: 404,
      error: `${resource} not found`,
      code: 'NOT_FOUND'
    };

    return res.status(404).json(response);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message
   * @returns {Object} Standardized unauthorized response
   */
  static unauthorized(res, message = 'Authentication required') {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: 401,
      error: message,
      code: 'UNAUTHORIZED'
    };

    return res.status(401).json(response);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message
   * @returns {Object} Standardized forbidden response
   */
  static forbidden(res, message = 'Access denied') {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: 403,
      error: message,
      code: 'FORBIDDEN'
    };

    return res.status(403).json(response);
  }

  /**
   * Internal server error response
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @returns {Object} Standardized server error response
   */
  static serverError(res, error = null) {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: 500,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    };

    // Add error details in development
    if (process.env.NODE_ENV === 'development' && error) {
      response.details = {
        message: error.message,
        stack: error.stack
      };
    }

    return res.status(500).json(response);
  }

  /**
   * Custom status response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {boolean} success - Success flag
   * @param {*} data - Response data
   * @param {string} message - Response message
   * @param {string} error - Error message
   * @param {string} code - Response code
   * @returns {Object} Custom standardized response
   */
  static custom(res, statusCode, success, data = null, message = null, error = null, code = null) {
    const response = {
      success,
      timestamp: new Date().toISOString(),
      statusCode,
      ...(message && { message }),
      ...(error && { error }),
      ...(code && { code }),
      ...(data !== null && { data })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Create response with metadata
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {Object} metadata - Additional metadata
   * @param {string} message - Success message
   * @returns {Object} Response with metadata
   */
  static withMetadata(res, data, metadata = {}, message = 'Operation completed successfully') {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      message,
      data,
      metadata
    };

    return res.status(200).json(response);
  }

  /**
   * Async wrapper for route handlers
   * Automatically handles errors and provides consistent error responses
   * @param {Function} fn - Async route handler function
   * @returns {Function} Wrapped route handler
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('Async handler error:', error);

        // Handle specific error types
        if (error.name === 'ValidationError') {
          return this.validationError(res, error.message);
        }

        if (error.name === 'CastError') {
          return this.error(res, 'Invalid ID format', 400, 'INVALID_ID');
        }

        if (error.code === 11000) {
          return this.error(res, 'Duplicate entry', 409, 'DUPLICATE_ENTRY');
        }

        // Default server error
        return this.serverError(res, error);
      });
    };
  }

  /**
   * Middleware to add response methods to res object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static middleware(req, res, next) {
    // Add helper methods to response object
    res.success = (data, message, statusCode) =>
      ResponseStandardizer.success(res, data, message, statusCode);

    res.error = (error, statusCode, code, details) =>
      ResponseStandardizer.error(res, error, statusCode, code, details);

    res.paginated = (data, pagination, message) =>
      ResponseStandardizer.paginated(res, data, pagination, message);

    res.validationError = (errors) =>
      ResponseStandardizer.validationError(res, errors);

    res.notFound = (resource) =>
      ResponseStandardizer.notFound(res, resource);

    res.unauthorized = (message) =>
      ResponseStandardizer.unauthorized(res, message);

    res.forbidden = (message) =>
      ResponseStandardizer.forbidden(res, message);

    res.serverError = (error) =>
      ResponseStandardizer.serverError(res, error);

    res.withMetadata = (data, metadata, message) =>
      ResponseStandardizer.withMetadata(res, data, metadata, message);

    next();
  }
}

module.exports = ResponseStandardizer;