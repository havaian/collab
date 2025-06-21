const { HTTP_STATUS, ERROR_CODES } = require('../utils/constants');
const { createErrorResponse } = require('../utils/helpers');
const { validationResult } = require('express-validator');

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please correct the following errors',
      errors: formattedErrors,
      errorCount: formattedErrors.length
    });
  }
  
  next();
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create specific error types
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_TOKEN);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCESS_DENIED);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.SERVICE_UNAVAILABLE);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Handle different types of errors and convert them to AppError format
 */
const handleError = (error) => {
  // MongoDB validation errors
  if (error.name === 'ValidationError' && error.errors) {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return new ValidationError('Validation failed', validationErrors);
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];
    return new ConflictError(`${field} '${value}' already exists`);
  }
  
  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid ${error.path}: ${error.value}`);
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  
  // Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large');
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field');
  }
  
  // Express validator errors
  if (error.array && typeof error.array === 'function') {
    const validationErrors = error.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
      location: err.location
    }));
    
    return new ValidationError('Validation failed', validationErrors);
  }
  
  // Axios/HTTP errors
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    if (status === 401) {
      return new AuthenticationError(message);
    } else if (status === 403) {
      return new AuthorizationError(message);
    } else if (status === 404) {
      return new NotFoundError(message);
    } else if (status === 429) {
      return new RateLimitError(message);
    } else if (status >= 500) {
      return new ServiceUnavailableError(message);
    }
    
    return new AppError(message, status, 'EXTERNAL_API_ERROR');
  }
  
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Default server error
  return new AppError(
    error.message || 'Internal server error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.DATABASE_ERROR
  );
};

/**
 * Log error details
 */
const logError = (error, req) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      errorCode: error.errorCode
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
    }
  };
  
  // Don't log sensitive information
  if (errorInfo.request.body) {
    const { password, token, apiKey, ...safeBody } = errorInfo.request.body;
    errorInfo.request.body = safeBody;
  }
  
  // Log based on error severity
  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(errorInfo, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ Client Error:', JSON.stringify({
      ...errorInfo,
      request: {
        ...errorInfo.request,
        stack: undefined // Don't log stack trace for client errors
      }
    }, null, 2));
  }
};

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  // Handle the error
  const handledError = handleError(error);
  
  // Log the error
  logError(handledError, req);
  
  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = createErrorResponse(
    handledError.message,
    handledError.errorCode,
    handledError.statusCode,
    isDevelopment ? {
      stack: handledError.stack,
      details: handledError.details,
      originalError: error.message !== handledError.message ? error.message : undefined
    } : handledError.details
  );
  
  // Send error response
  res.status(handledError.statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  
  logError(error, req);
  
  const errorResponse = createErrorResponse(
    error.message,
    error.errorCode,
    error.statusCode
  );
  
  res.status(error.statusCode).json(errorResponse);
};

/**
 * Async error wrapper to catch promise rejections
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle uncaught exceptions and unhandled promise rejections
 */
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    console.error('Shutting down application...');
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    console.error('Shutting down application...');
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed successfully');
      
      // Close database connection
      if (require('mongoose').connection.readyState === 1) {
        require('mongoose').connection.close(() => {
          console.log('✅ Database connection closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Error boundary for specific routes
 */
const createErrorBoundary = (routeName) => {
  return (error, req, res, next) => {
    error.context = routeName;
    next(error);
  };
};

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

/**
 * Database error handler
 */
const handleDatabaseError = (error) => {
  if (error.name === 'MongoNetworkError') {
    return new ServiceUnavailableError('Database connection failed');
  }
  
  if (error.name === 'MongoTimeoutError') {
    return new ServiceUnavailableError('Database operation timed out');
  }
  
  if (error.name === 'MongoWriteConcernError') {
    return new AppError('Database write operation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR);
  }
  
  return handleError(error);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  
  // Middleware functions
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Utility functions
  handleError,
  handleDatabaseError,
  logError,
  formatValidationErrors,
  createErrorBoundary,
  
  // Process handlers
  handleUncaughtExceptions,
  gracefulShutdown,

  handleValidationErrors
};