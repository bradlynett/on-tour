const winston = require('winston');
const path = require('path');

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
        new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' })
    ]
});

class TravelErrorHandler {
    constructor() {
        this.errorMessages = {
            // Amadeus specific errors
            'INVALID DATE': 'The requested date is in the past or invalid. Please select a future date.',
            'INVALID LOCATION': 'The airport or city code is not recognized. Please check your input.',
            'NO FLIGHTS FOUND': 'No flights available for the specified route and date. Try different dates or nearby airports.',
            'NO HOTELS FOUND': 'No hotels available for the specified location and dates. Try different dates or nearby cities.',
            'RATE LIMIT EXCEEDED': 'Too many requests. Please wait a moment and try again.',
            'AUTHENTICATION FAILED': 'Travel service authentication failed. Please contact support.',
            'SERVICE UNAVAILABLE': 'Travel service is temporarily unavailable. Please try again later.',
            
            // Generic errors
            'VALIDATION_ERROR': 'Invalid request parameters. Please check your input.',
            'CACHE_ERROR': 'Unable to retrieve cached results. Please try again.',
            'PROVIDER_ERROR': 'One or more travel providers are currently unavailable.',
            'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
            'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again or contact support.'
        };
    }

    // Handle Amadeus API errors
    handleAmadeusError(error, context = {}) {
        let errorType = 'UNKNOWN_ERROR';
        let userMessage = this.errorMessages['UNKNOWN_ERROR'];
        let shouldRetry = false;
        let logLevel = 'error';

        // Extract error details from Amadeus response
        if (error.response && error.response.result && error.response.result.errors) {
            const amadeusError = error.response.result.errors[0];
            const errorCode = amadeusError.code;
            const errorTitle = amadeusError.title;
            const errorDetail = amadeusError.detail;

            // Map Amadeus error codes to user-friendly messages
            switch (errorCode) {
                case 425: // INVALID DATE
                    errorType = 'INVALID DATE';
                    userMessage = this.errorMessages['INVALID DATE'];
                    break;
                case 400: // Bad Request
                    if (errorTitle === 'INVALID LOCATION') {
                        errorType = 'INVALID LOCATION';
                        userMessage = this.errorMessages['INVALID LOCATION'];
                    } else {
                        errorType = 'VALIDATION_ERROR';
                        userMessage = this.errorMessages['VALIDATION_ERROR'];
                    }
                    break;
                case 401: // Unauthorized
                    errorType = 'AUTHENTICATION FAILED';
                    userMessage = this.errorMessages['AUTHENTICATION FAILED'];
                    break;
                case 429: // Rate Limited
                    errorType = 'RATE LIMIT EXCEEDED';
                    userMessage = this.errorMessages['RATE LIMIT EXCEEDED'];
                    shouldRetry = true;
                    logLevel = 'warn';
                    break;
                case 503: // Service Unavailable
                    errorType = 'SERVICE UNAVAILABLE';
                    userMessage = this.errorMessages['SERVICE UNAVAILABLE'];
                    shouldRetry = true;
                    logLevel = 'warn';
                    break;
                default:
                    // Check if it's a "no results" type error
                    if (errorDetail && errorDetail.includes('no results') || errorDetail && errorDetail.includes('not found')) {
                        errorType = context.type === 'hotel' ? 'NO HOTELS FOUND' : 'NO FLIGHTS FOUND';
                        userMessage = this.errorMessages[errorType];
                        logLevel = 'info'; // Not really an error, just no results
                    }
            }

            // Log the detailed error
            logger[logLevel](`Amadeus API Error`, {
                errorType,
                errorCode,
                errorTitle,
                errorDetail,
                context,
                fullError: error
            });
        } else if (error.description) {
            // Handle errors from Amadeus SDK
            const errorDetail = Array.isArray(error.description) ? error.description[0] : error.description;
            if (errorDetail && errorDetail.detail) {
                if (errorDetail.detail.includes('past')) {
                    errorType = 'INVALID DATE';
                    userMessage = this.errorMessages['INVALID DATE'];
                } else if (errorDetail.detail.includes('not found')) {
                    errorType = context.type === 'hotel' ? 'NO HOTELS FOUND' : 'NO FLIGHTS FOUND';
                    userMessage = this.errorMessages[errorType];
                    logLevel = 'info';
                }
            }

            logger[logLevel](`Amadeus SDK Error`, {
                errorType,
                errorDescription: error.description,
                context,
                fullError: error
            });
        } else {
            // Generic error handling
            logger.error(`Unknown Amadeus Error`, {
                errorType,
                context,
                fullError: error
            });
        }

        return {
            errorType,
            userMessage,
            shouldRetry,
            technicalDetails: process.env.NODE_ENV === 'development' ? {
                originalError: error.message || error.toString(),
                context
            } : undefined
        };
    }

    // Handle general travel service errors
    handleTravelError(error, context = {}) {
        let errorType = 'UNKNOWN_ERROR';
        let userMessage = this.errorMessages['UNKNOWN_ERROR'];
        let shouldRetry = false;

        if (error.message) {
            if (error.message.includes('network') || error.message.includes('connection')) {
                errorType = 'NETWORK_ERROR';
                userMessage = this.errorMessages['NETWORK_ERROR'];
                shouldRetry = true;
            } else if (error.message.includes('cache')) {
                errorType = 'CACHE_ERROR';
                userMessage = this.errorMessages['CACHE_ERROR'];
            } else if (error.message.includes('validation')) {
                errorType = 'VALIDATION_ERROR';
                userMessage = this.errorMessages['VALIDATION_ERROR'];
            }
        }

        logger.error(`Travel Service Error`, {
            errorType,
            errorMessage: error.message,
            context,
            fullError: error
        });

        return {
            errorType,
            userMessage,
            shouldRetry,
            technicalDetails: process.env.NODE_ENV === 'development' ? {
                originalError: error.message,
                context
            } : undefined
        };
    }

    // Create standardized error response for API endpoints
    createErrorResponse(error, context = {}) {
        let errorInfo;

        // Determine if it's an Amadeus error
        if (error.response && error.response.result && error.response.result.errors) {
            errorInfo = this.handleAmadeusError(error, context);
        } else if (error.description || (error.code && error.code === 'ClientError')) {
            errorInfo = this.handleAmadeusError(error, context);
        } else {
            errorInfo = this.handleTravelError(error, context);
        }

        return {
            success: false,
            error: {
                type: errorInfo.errorType,
                message: errorInfo.userMessage,
                shouldRetry: errorInfo.shouldRetry,
                ...(errorInfo.technicalDetails && { technicalDetails: errorInfo.technicalDetails })
            },
            timestamp: new Date().toISOString()
        };
    }

    // Log successful operations for monitoring
    logSuccess(operation, context = {}) {
        logger.info(`Travel operation successful`, {
            operation,
            context,
            timestamp: new Date().toISOString()
        });
    }

    // Log performance metrics
    logPerformance(operation, duration, context = {}) {
        logger.info(`Travel operation performance`, {
            operation,
            duration: `${duration}ms`,
            context,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new TravelErrorHandler(); 