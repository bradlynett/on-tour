const express = require('express');
const router = express.Router();
const unifiedTravelService = require('../services/unifiedTravelService');
const { authenticateToken } = require('../middleware/auth');
const errorHandler = require('../services/errorHandler');
const winston = require('winston');

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
        new winston.transports.Console()
    ]
});

// Simple validation function
const validateQuery = (schema) => {
    return (req, res, next) => {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = req.query[field];
            
            if (rules.required && !value) {
                errors.push(`${field} is required`);
                continue;
            }
            
            if (value) {
                if (rules.type === 'string') {
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`${field} must be at least ${rules.minLength} characters`);
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
                    }
                    if (rules.pattern && !rules.pattern.test(value)) {
                        errors.push(`${field} format is invalid`);
                    }
                } else if (rules.type === 'number') {
                    const numValue = parseInt(value);
                    if (isNaN(numValue)) {
                        errors.push(`${field} must be a number`);
                    } else {
                        if (rules.min && numValue < rules.min) {
                            errors.push(`${field} must be at least ${rules.min}`);
                        }
                        if (rules.max && numValue > rules.max) {
                            errors.push(`${field} must be no more than ${rules.max}`);
                        }
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }
        
        next();
    };
};

// Validation schemas
const flightSearchSchema = {
    origin: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    destination: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    departureDate: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    returnDate: { type: 'string', required: false, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    passengers: { type: 'number', required: false, min: 1, max: 9 },
    maxResults: { type: 'number', required: false, min: 1, max: 50 }
};

const hotelSearchSchema = {
    cityCode: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    checkInDate: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    checkOutDate: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    adults: { type: 'number', required: false, min: 1, max: 10 },
    radius: { type: 'number', required: false, min: 1, max: 50 },
    maxResults: { type: 'number', required: false, min: 1, max: 100 }
};

const carRentalSearchSchema = {
    pickUpLocation: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    dropOffLocation: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    pickUpDate: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ },
    dropOffDate: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ },
    maxResults: { type: 'number', required: false, min: 1, max: 50 }
};

const airportSearchSchema = {
    keyword: { type: 'string', required: true, minLength: 2, maxLength: 50 }
};

const multiCityFlightSchema = {
    segments: { type: 'string', required: true }, // JSON string of flight segments
    passengers: { type: 'number', required: false, min: 1, max: 9 },
    maxResults: { type: 'number', required: false, min: 1, max: 50 }
};

const travelPackageSchema = {
    origin: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    destination: { type: 'string', required: true, minLength: 3, maxLength: 3 },
    departureDate: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    returnDate: { type: 'string', required: false, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    passengers: { type: 'number', required: false, min: 1, max: 9 },
    includeHotel: { type: 'string', required: false, pattern: /^(true|false)$/ },
    includeCar: { type: 'string', required: false, pattern: /^(true|false)$/ },
    maxResults: { type: 'number', required: false, min: 1, max: 20 }
};

// Flight Search
router.get('/flights', authenticateToken, validateQuery(flightSearchSchema), async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'flight_search',
        query: req.query 
    };
    
    try {
        const { origin, destination, departureDate, returnDate, passengers = 1, maxResults = 10, provider } = req.query;
        
        logger.info(`Flight search request from user ${req.user.id}: ${origin} to ${destination} (provider: ${provider || 'all'})`);
        
        const results = await unifiedTravelService.searchFlights(
            origin,
            destination,
            departureDate,
            returnDate,
            parseInt(passengers),
            parseInt(maxResults),
            provider
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('flight_search_api', { ...context, count: results.flights.length });
        errorHandler.logPerformance('flight_search_api', duration, context);
        
        res.json({
            success: true,
            data: results.flights,
            providers: results.providers,
            meta: {
                ...results.meta,
                count: results.flights.length,
                providerCount: results.providers.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('flight_search_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Hotel Search
router.get('/hotels', authenticateToken, validateQuery(hotelSearchSchema), async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'hotel_search',
        query: req.query 
    };
    
    try {
        const { cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20 } = req.query;
        
        logger.info(`Hotel search request from user ${req.user.id}: ${cityCode}`);
        
        const results = await unifiedTravelService.searchHotels(
            cityCode,
            checkInDate,
            checkOutDate,
            parseInt(adults),
            parseInt(radius),
            parseInt(maxResults)
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('hotel_search_api', { ...context, count: results.hotels.length });
        errorHandler.logPerformance('hotel_search_api', duration, context);
        
        res.json({
            success: true,
            data: results.hotels,
            providers: results.providers,
            meta: {
                ...results.meta,
                count: results.hotels.length,
                providerCount: results.providers.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('hotel_search_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Car Rental Search
router.get('/cars', authenticateToken, validateQuery(carRentalSearchSchema), async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'car_rental_search',
        query: req.query 
    };
    
    try {
        const { pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10 } = req.query;
        
        logger.info(`Car rental search request from user ${req.user.id}: ${pickUpLocation} to ${dropOffLocation}`);
        
        const cars = await unifiedTravelService.searchCarRentals(
            pickUpLocation,
            dropOffLocation,
            pickUpDate,
            dropOffDate,
            parseInt(maxResults)
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('car_rental_search_api', { ...context, count: cars.length });
        errorHandler.logPerformance('car_rental_search_api', duration, context);
        
        res.json({
            success: true,
            data: cars,
            meta: {
                pickUpLocation,
                dropOffLocation,
                pickUpDate,
                dropOffDate,
                count: cars.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('car_rental_search_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Airport/City Search
router.get('/airports', authenticateToken, validateQuery(airportSearchSchema), async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'airport_search',
        query: req.query 
    };
    
    try {
        const { keyword } = req.query;
        
        logger.info(`Airport search request from user ${req.user.id}: ${keyword}`);
        
        const results = await unifiedTravelService.searchAirports(keyword);
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('airport_search_api', { ...context, count: results.airports.length });
        errorHandler.logPerformance('airport_search_api', duration, context);
        
        res.json({
            success: true,
            data: results.airports,
            providers: results.providers,
            meta: {
                ...results.meta,
                count: results.airports.length,
                providerCount: Object.keys(results.providers).length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('airport_search_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Flight Price History
router.get('/flights/price-history', authenticateToken, async (req, res) => {
    try {
        const { origin, destination, departureDate } = req.query;
        
        if (!origin || !destination || !departureDate) {
            return res.status(400).json({
                success: false,
                error: 'Origin, destination, and departure date are required'
            });
        }
        
        logger.info(`Flight price history request from user ${req.user.id}: ${origin} to ${destination}`);
        
        const priceHistory = await amadeusService.getFlightPriceHistory(origin, destination, departureDate);
        
        res.json({
            success: true,
            data: priceHistory,
            meta: {
                origin,
                destination,
                departureDate
            }
        });
        
    } catch (error) {
        logger.error(`Flight price history error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clear Cache (Admin only)
router.delete('/cache/:type', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin (you may want to add admin role checking)
        const { type } = req.params;
        
        logger.info(`Cache clear request from user ${req.user.id}: ${type}`);
        
        await amadeusService.clearCache(type);
        
        res.json({
            success: true,
            message: `Cache cleared for ${type}`
        });
        
    } catch (error) {
        logger.error(`Cache clear error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check for unified travel service
router.get('/health', async (req, res) => {
    try {
        const health = await unifiedTravelService.healthCheck();
        
        res.json({
            success: true,
            ...health
        });
        
    } catch (error) {
        logger.error(`Travel service health check failed: ${error.message}`);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get available providers
router.get('/providers', authenticateToken, async (req, res) => {
    try {
        const providers = await unifiedTravelService.getAvailableProviders();
        
        res.json({
            success: true,
            data: providers
        });
        
    } catch (error) {
        logger.error(`Provider status check failed: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get provider statistics
router.get('/providers/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await unifiedTravelService.getProviderStats();
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        logger.error(`Provider stats check failed: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Multi-City Flight Search
router.get('/flights/multi-city', authenticateToken, validateQuery(multiCityFlightSchema), async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'multi_city_flight_search',
        query: req.query 
    };
    
    try {
        const { segments, passengers = 1, maxResults = 10 } = req.query;
        
        let flightSegments;
        try {
            flightSegments = JSON.parse(segments);
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'Invalid segments format. Must be valid JSON array.',
                    shouldRetry: false
                }
            });
        }
        
        if (!Array.isArray(flightSegments) || flightSegments.length < 2) {
            return res.status(400).json({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'At least 2 flight segments are required for multi-city search.',
                    shouldRetry: false
                }
            });
        }
        
        logger.info(`Multi-city flight search request from user ${req.user.id}: ${flightSegments.length} segments`);
        
        const results = await unifiedTravelService.searchMultiCityFlights(
            flightSegments,
            parseInt(passengers),
            parseInt(maxResults)
        );
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('multi_city_flight_search_api', { ...context, count: results.flights.length });
        errorHandler.logPerformance('multi_city_flight_search_api', duration, context);
        
        res.json({
            success: true,
            data: results.flights,
            providers: results.providers,
            meta: {
                segments: flightSegments.length,
                passengers: parseInt(passengers),
                count: results.flights.length,
                providerCount: results.providers.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('multi_city_flight_search_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

// Travel Package Search (Flight + Hotel + Car)
router.get('/packages', authenticateToken, validateQuery(travelPackageSchema), async (req, res) => {
    const startTime = Date.now();
    const context = { 
        userId: req.user.id, 
        operation: 'travel_package_search',
        query: req.query 
    };
    
    try {
        const { 
            origin, destination, departureDate, returnDate, 
            passengers = 1, includeHotel = 'true', includeCar = 'false', 
            maxResults = 10 
        } = req.query;
        
        logger.info(`Travel package search request from user ${req.user.id}: ${origin} to ${destination}`);
        
        const results = await unifiedTravelService.searchTravelPackages({
            origin,
            destination,
            departureDate,
            returnDate,
            passengers: parseInt(passengers),
            includeHotel: includeHotel === 'true',
            includeCar: includeCar === 'true',
            maxResults: parseInt(maxResults)
        });
        
        const duration = Date.now() - startTime;
        errorHandler.logSuccess('travel_package_search_api', { ...context, count: results.packages.length });
        errorHandler.logPerformance('travel_package_search_api', duration, context);
        
        res.json({
            success: true,
            data: results.packages,
            providers: results.providers,
            meta: {
                origin,
                destination,
                departureDate,
                returnDate,
                passengers: parseInt(passengers),
                includeHotel: includeHotel === 'true',
                includeCar: includeCar === 'true',
                count: results.packages.length,
                providerCount: results.providers.length,
                responseTime: duration
            }
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        errorHandler.logPerformance('travel_package_search_api', duration, { ...context, error: true });
        
        const errorResponse = errorHandler.createErrorResponse(error, context);
        const statusCode = errorResponse.error.type === 'VALIDATION_ERROR' ? 400 : 500;
        
        res.status(statusCode).json(errorResponse);
    }
});

module.exports = router; 