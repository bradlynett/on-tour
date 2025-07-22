const performanceMonitor = require('../scripts/performance-monitor');

class AppError extends Error {
    constructor(message, statusCode, errorCode = null, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Error types
const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND_ERROR',
    CONFLICT: 'CONFLICT_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    DATABASE: 'DATABASE_ERROR',
    EXTERNAL_API: 'EXTERNAL_API_ERROR',
    CACHE: 'CACHE_ERROR',
    INTERNAL: 'INTERNAL_ERROR'
};

// Error codes mapping
const ErrorCodes = {
    // Validation errors
    INVALID_INPUT: { type: ErrorTypes.VALIDATION, statusCode: 400 },
    MISSING_REQUIRED_FIELD: { type: ErrorTypes.VALIDATION, statusCode: 400 },
    INVALID_FORMAT: { type: ErrorTypes.VALIDATION, statusCode: 400 },
    
    // Authentication errors
    INVALID_TOKEN: { type: ErrorTypes.AUTHENTICATION, statusCode: 401 },
    TOKEN_EXPIRED: { type: ErrorTypes.AUTHENTICATION, statusCode: 401 },
    INVALID_CREDENTIALS: { type: ErrorTypes.AUTHENTICATION, statusCode: 401 },
    
    // Authorization errors
    INSUFFICIENT_PERMISSIONS: { type: ErrorTypes.AUTHORIZATION, statusCode: 403 },
    RESOURCE_ACCESS_DENIED: { type: ErrorTypes.AUTHORIZATION, statusCode: 403 },
    
    // Not found errors
    USER_NOT_FOUND: { type: ErrorTypes.NOT_FOUND, statusCode: 404 },
    EVENT_NOT_FOUND: { type: ErrorTypes.NOT_FOUND, statusCode: 404 },
    TRIP_NOT_FOUND: { type: ErrorTypes.NOT_FOUND, statusCode: 404 },
    INTEREST_NOT_FOUND: { type: ErrorTypes.NOT_FOUND, statusCode: 404 },
    
    // Conflict errors
    DUPLICATE_ENTRY: { type: ErrorTypes.CONFLICT, statusCode: 409 },
    PRIORITY_CONFLICT: { type: ErrorTypes.CONFLICT, statusCode: 409 },
    RESOURCE_IN_USE: { type: ErrorTypes.CONFLICT, statusCode: 409 },
    
    // Rate limiting
    RATE_LIMIT_EXCEEDED: { type: ErrorTypes.RATE_LIMIT, statusCode: 429 },
    
    // Database errors
    DATABASE_CONNECTION: { type: ErrorTypes.DATABASE, statusCode: 500 },
    DATABASE_QUERY: { type: ErrorTypes.DATABASE, statusCode: 500 },
    TRANSACTION_FAILED: { type: ErrorTypes.DATABASE, statusCode: 500 },
    
    // External API errors
    EXTERNAL_API_TIMEOUT: { type: ErrorTypes.EXTERNAL_API, statusCode: 502 },
    EXTERNAL_API_ERROR: { type: ErrorTypes.EXTERNAL_API, statusCode: 502 },
    
    // Cache errors
    CACHE_CONNECTION: { type: ErrorTypes.CACHE, statusCode: 500 },
    CACHE_OPERATION: { type: ErrorTypes.CACHE, statusCode: 500 },
    
    // Internal errors
    INTERNAL_SERVER: { type: ErrorTypes.INTERNAL, statusCode: 500 },
    UNKNOWN_ERROR: { type: ErrorTypes.INTERNAL, statusCode: 500 }
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error details
    const errorDetails = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id || 'anonymous',
        error: {
            message: err.message,
            stack: err.stack,
            statusCode: err.statusCode,
            errorCode: err.errorCode
        }
    };

    console.error('Error Details:', JSON.stringify(errorDetails, null, 2));

    // Record error in performance monitor
    if (performanceMonitor) {
        const errorType = err.errorCode ? ErrorCodes[err.errorCode]?.type : ErrorTypes.INTERNAL;
        performanceMonitor.recordError(errorType.toLowerCase(), err);
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new AppError(message, 400, 'INVALID_INPUT');
    }

    if (err.name === 'CastError') {
        const message = 'Invalid resource ID format';
        error = new AppError(message, 400, 'INVALID_FORMAT');
    }

    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new AppError(message, 409, 'DUPLICATE_ENTRY');
    }

    if (err.code === '23505') {
        const message = 'Duplicate entry detected';
        error = new AppError(message, 409, 'DUPLICATE_ENTRY');
    }

    if (err.code === '23503') {
        const message = 'Referenced resource does not exist';
        error = new AppError(message, 400, 'INVALID_INPUT');
    }

    if (err.code === '23514') {
        const message = 'Data validation failed';
        error = new AppError(message, 400, 'INVALID_INPUT');
    }

    // Handle Redis errors
    if (err.code === 'ECONNREFUSED' && err.syscall === 'connect') {
        const message = 'Cache service unavailable';
        error = new AppError(message, 500, 'CACHE_CONNECTION');
    }

    // Handle external API errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        const message = 'External service timeout';
        error = new AppError(message, 502, 'EXTERNAL_API_TIMEOUT');
    }

    // Handle rate limiting errors
    if (err.statusCode === 429) {
        error = new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Default error
    if (!error.statusCode) {
        error = new AppError('Internal server error', 500, 'INTERNAL_SERVER');
    }

    // Send error response
    const response = {
        success: false,
        message: error.message,
        error: error.errorCode || 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error.details
        })
    };

    // Add additional context for specific error types
    if (error.errorCode === 'RATE_LIMIT_EXCEEDED') {
        response.retryAfter = Math.ceil(error.details?.retryAfter || 60);
    }

    if (error.errorCode === 'VALIDATION_ERROR') {
        response.validationErrors = error.details;
    }

    res.status(error.statusCode).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Route ${req.originalUrl} not found`,
        404,
        'NOT_FOUND'
    );
    next(error);
};

// Validation error handler
const validationErrorHandler = (validationResult) => {
    return (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new AppError(
                'Validation failed',
                400,
                'VALIDATION_ERROR',
                errors.array()
            );
            return next(error);
        }
        next();
    };
};

// Database error handler
const databaseErrorHandler = (err, req, res, next) => {
    if (err.code) {
        // PostgreSQL specific error codes
        switch (err.code) {
            case '23505': // unique_violation
                return next(new AppError('Duplicate entry detected', 409, 'DUPLICATE_ENTRY'));
            case '23503': // foreign_key_violation
                return next(new AppError('Referenced resource does not exist', 400, 'INVALID_INPUT'));
            case '23514': // check_violation
                return next(new AppError('Data validation failed', 400, 'INVALID_INPUT'));
            case '42P01': // undefined_table
                return next(new AppError('Database table not found', 500, 'DATABASE_ERROR'));
            case '42703': // undefined_column
                return next(new AppError('Database column not found', 500, 'DATABASE_ERROR'));
            default:
                return next(new AppError('Database operation failed', 500, 'DATABASE_ERROR'));
        }
    }
    next(err);
};

// Cache error handler
const cacheErrorHandler = (err, req, res, next) => {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.warn('Cache connection failed, continuing without cache:', err.message);
        // Continue without cache - don't fail the request
        return next();
    }
    next(err);
};

// Rate limiting error handler
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.statusCode === 429) {
        return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            error: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(err.retryAfter || 60)
        });
    }
    next(err);
};

module.exports = {
    AppError,
    ErrorTypes,
    ErrorCodes,
    errorHandler,
    asyncHandler,
    notFoundHandler,
    validationErrorHandler,
    databaseErrorHandler,
    cacheErrorHandler,
    rateLimitErrorHandler
}; 