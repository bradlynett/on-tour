const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (stack) {
            log += `\n${stack}`;
        }
        
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (stack) {
            log += `\n${stack}`;
        }
        
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'concert-travel-app' },
    transports: [
        // Error logs
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        }),
        
        // Combined logs
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        }),
        
        // API logs
        new DailyRotateFile({
            filename: path.join(logsDir, 'api-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        }),
        
        // Performance logs
        new DailyRotateFile({
            filename: path.join(logsDir, 'performance-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Specialized loggers
const apiLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'concert-travel-app', component: 'api' },
    transports: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'api-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        })
    ]
});

const performanceLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'concert-travel-app', component: 'performance' },
    transports: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'performance-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        })
    ]
});

const databaseLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'concert-travel-app', component: 'database' },
    transports: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'database-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        })
    ]
});

const cacheLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'concert-travel-app', component: 'cache' },
    transports: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'cache-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        })
    ]
});

// Logging utility functions
const logApiRequest = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    apiLogger.info('API Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        apiLogger.info('API Response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id || 'anonymous',
            timestamp: new Date().toISOString()
        });
        
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

const logDatabaseQuery = (query, params, duration, success = true) => {
    databaseLogger.info('Database Query', {
        query: query.replace(/\s+/g, ' ').trim(),
        params: params || [],
        duration: `${duration}ms`,
        success,
        timestamp: new Date().toISOString()
    });
};

const logCacheOperation = (operation, key, duration, success = true) => {
    cacheLogger.info('Cache Operation', {
        operation,
        key,
        duration: `${duration}ms`,
        success,
        timestamp: new Date().toISOString()
    });
};

const logPerformance = (operation, duration, metadata = {}) => {
    performanceLogger.info('Performance Metric', {
        operation,
        duration: `${duration}ms`,
        ...metadata,
        timestamp: new Date().toISOString()
    });
};

const logError = (error, context = {}) => {
    logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        errorCode: error.errorCode,
        statusCode: error.statusCode,
        ...context,
        timestamp: new Date().toISOString()
    });
};

const logSecurity = (event, details = {}) => {
    logger.warn('Security Event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

const logUserAction = (userId, action, details = {}) => {
    logger.info('User Action', {
        userId,
        action,
        ...details,
        timestamp: new Date().toISOString()
    });
};

// Log rotation and cleanup
const cleanupOldLogs = () => {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoffDate = new Date(Date.now() - maxAge);
    
    fs.readdir(logsDir, (err, files) => {
        if (err) {
            logger.error('Error reading logs directory', { error: err.message });
            return;
        }
        
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                if (stats.mtime < cutoffDate) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            logger.error('Error deleting old log file', { file, error: err.message });
                        } else {
                            logger.info('Deleted old log file', { file });
                        }
                    });
                }
            });
        });
    });
};

// Run cleanup daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Export logger and utilities
module.exports = {
    logger,
    apiLogger,
    performanceLogger,
    databaseLogger,
    cacheLogger,
    logApiRequest,
    logDatabaseQuery,
    logCacheOperation,
    logPerformance,
    logError,
    logSecurity,
    logUserAction,
    cleanupOldLogs
}; 