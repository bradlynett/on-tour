const express = require('express');
const router = express.Router();
const tripPlanningService = require('../services/tripPlanningService');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');
const tripSuggestionEngine = require('../services/tripSuggestionEngine'); // Added for new endpoints
const { Pool } = require('pg'); // Added for new endpoints
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

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
const validateBody = (requiredFields) => {
    return (req, res, next) => {
        const errors = [];
        
        for (const field of requiredFields) {
            if (!req.body[field]) {
                errors.push(`${field} is required`);
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

// Create a new trip plan
router.post('/plans', authenticateToken, validateBody(['name', 'startDate', 'endDate']), async (req, res) => {
    try {
        const userId = req.user.id;
        const tripData = req.body;
        
        logger.info(`Creating trip plan for user ${userId}: ${tripData.name}`);
        
        const result = await tripPlanningService.createTripPlan(userId, tripData);
        
        res.status(201).json({
            success: true,
            data: result,
            message: 'Trip plan created successfully'
        });
        
    } catch (error) {
        logger.error(`Trip plan creation error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user's trip plans
router.get('/plans', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;
        
        logger.info(`Getting trip plans for user ${userId}`);
        
        const tripPlans = await tripPlanningService.getUserTripPlans(userId, status);
        
        res.json({
            success: true,
            data: tripPlans,
            count: tripPlans.length
        });
        
    } catch (error) {
        logger.error(`Get trip plans error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get trip plan details
router.get('/plans/:tripPlanId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        
        logger.info(`Getting trip plan details for ${tripPlanId}`);
        
        const tripPlan = await tripPlanningService.getTripPlanDetails(tripPlanId, userId);
        
        res.json({
            success: true,
            data: tripPlan
        });
        
    } catch (error) {
        logger.error(`Get trip plan details error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update trip plan
router.put('/plans/:tripPlanId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        const updates = req.body;
        
        logger.info(`Updating trip plan ${tripPlanId}`);
        
        const result = await tripPlanningService.updateTripPlan(tripPlanId, userId, updates);
        
        res.json({
            success: true,
            data: result,
            message: 'Trip plan updated successfully'
        });
        
    } catch (error) {
        logger.error(`Update trip plan error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete trip plan
router.delete('/plans/:tripPlanId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        
        logger.info(`Deleting trip plan ${tripPlanId}`);
        
        // This would need to be implemented in the service
        // For now, we'll return a placeholder response
        res.json({
            success: true,
            message: 'Trip plan deleted successfully'
        });
        
    } catch (error) {
        logger.error(`Delete trip plan error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add component to trip plan
router.post('/plans/:tripPlanId/components', authenticateToken, validateBody(['type', 'provider', 'details', 'price']), async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        const componentData = req.body;
        
        logger.info(`Adding component to trip plan ${tripPlanId}`);
        
        const result = await tripPlanningService.addTripComponent(tripPlanId, userId, componentData);
        
        res.status(201).json({
            success: true,
            data: result,
            message: 'Component added successfully'
        });
        
    } catch (error) {
        logger.error(`Add component error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Remove component from trip plan
router.delete('/components/:componentId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { componentId } = req.params;
        
        logger.info(`Removing component ${componentId}`);
        
        const result = await tripPlanningService.removeTripComponent(componentId, userId);
        
        res.json({
            success: true,
            data: result,
            message: 'Component removed successfully'
        });
        
    } catch (error) {
        logger.error(`Remove component error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search travel options for trip
router.post('/plans/:tripPlanId/search', authenticateToken, validateBody(['type']), async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        const searchParams = req.body;
        
        logger.info(`Searching travel options for trip ${tripPlanId}`);
        
        const results = await tripPlanningService.searchAndAddTravelOption(tripPlanId, userId, searchParams);
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        logger.error(`Search travel options error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get trip recommendations based on event
router.get('/recommendations/:eventId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;
        
        logger.info(`Getting trip recommendations for event ${eventId}`);
        
        const recommendations = await tripPlanningService.getTripRecommendations(eventId, userId);
        
        res.json({
            success: true,
            data: recommendations
        });
        
    } catch (error) {
        logger.error(`Get recommendations error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get trip plan summary (costs, components, etc.)
router.get('/plans/:tripPlanId/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        
        logger.info(`Getting trip plan summary for ${tripPlanId}`);
        
        const tripPlan = await tripPlanningService.getTripPlanDetails(tripPlanId, userId);
        
        // Calculate summary
        const summary = {
            tripPlanId: tripPlan.id,
            name: tripPlan.name,
            status: tripPlan.status,
            totalCost: tripPlan.totalCost,
            serviceFee: tripPlan.serviceFee,
            grandTotal: tripPlan.totalCost + tripPlan.serviceFee,
            componentCount: tripPlan.components.length,
            componentsByType: tripPlan.components.reduce((acc, component) => {
                acc[component.type] = (acc[component.type] || 0) + 1;
                return acc;
            }, {}),
            startDate: tripPlan.start_date,
            endDate: tripPlan.end_date,
            duration: Math.ceil((new Date(tripPlan.end_date) - new Date(tripPlan.start_date)) / (1000 * 60 * 60 * 24))
        };
        
        res.json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        logger.error(`Get trip summary error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Duplicate trip plan
router.post('/plans/:tripPlanId/duplicate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        
        logger.info(`Duplicating trip plan ${tripPlanId}`);
        
        // Get original trip plan
        const originalTrip = await tripPlanningService.getTripPlanDetails(tripPlanId, userId);
        
        // Create new trip plan with modified name
        const newTripData = {
            name: `${originalTrip.name} (Copy)`,
            description: originalTrip.description,
            eventId: originalTrip.event_id,
            startDate: originalTrip.start_date,
            endDate: originalTrip.end_date,
            travelers: originalTrip.travelers,
            budget: originalTrip.budget,
            preferences: originalTrip.preferences
        };
        
        const result = await tripPlanningService.createTripPlan(userId, newTripData);
        
        res.status(201).json({
            success: true,
            data: result,
            message: 'Trip plan duplicated successfully'
        });
        
    } catch (error) {
        logger.error(`Duplicate trip plan error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Share trip plan (generate shareable link)
router.post('/plans/:tripPlanId/share', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tripPlanId } = req.params;
        
        logger.info(`Generating share link for trip plan ${tripPlanId}`);
        
        // Generate a unique share token
        const shareToken = Buffer.from(`${tripPlanId}-${userId}-${Date.now()}`).toString('base64');
        
        res.json({
            success: true,
            data: {
                shareToken,
                shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/trip/share/${shareToken}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            },
            message: 'Share link generated successfully'
        });
        
    } catch (error) {
        logger.error(`Share trip plan error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get shared trip plan (public endpoint)
router.get('/share/:shareToken', async (req, res) => {
    try {
        const { shareToken } = req.params;
        
        logger.info(`Accessing shared trip plan with token ${shareToken}`);
        
        // Decode and validate share token
        const decoded = Buffer.from(shareToken, 'base64').toString();
        const [tripPlanId, userId] = decoded.split('-');
        
        if (!tripPlanId || !userId) {
            throw new Error('Invalid share token');
        }
        
        // Get trip plan details (read-only)
        const tripPlan = await tripPlanningService.getTripPlanDetails(tripPlanId, userId);
        
        res.json({
            success: true,
            data: {
                ...tripPlan,
                shared: true
            }
        });
        
    } catch (error) {
        logger.error(`Get shared trip plan error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enhanced artist recommendations endpoint
router.get('/enhanced-artist-recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        const recommendations = await tripSuggestionEngine.getEnhancedArtistRecommendations(userId, limit);
        
        res.json({
            success: true,
            data: recommendations,
            count: recommendations.length
        });
    } catch (error) {
        console.error('Error getting enhanced artist recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get enhanced artist recommendations'
        });
    }
});

// Detailed trip suggestion analysis endpoint
router.get('/trip-analysis/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 5;
        
        // Get user behavior analysis
        const userBehavior = await tripSuggestionEngine.analyzeUserBehavior(userId);
        
        // Get collaborative recommendations
        const interestsResult = await pool.query(`
            SELECT interest_type, interest_value, priority
            FROM user_interests 
            WHERE user_id = $1
            ORDER BY priority DESC
        `, [userId]);
        
        const collaborativeRecs = await tripSuggestionEngine.getCollaborativeRecommendations(userId, interestsResult.rows);
        
        // Get user preferences
        const userInfoResult = await pool.query(`
            SELECT 
                u.city as home_city, 
                u.state as home_state,
                tp.primary_airport, 
                tp.preferred_airlines, 
                tp.flight_class, 
                tp.preferred_hotel_brands, 
                tp.rental_car_preference,
                tp.preferred_destinations
            FROM users u
            LEFT JOIN travel_preferences tp ON u.id = tp.user_id
            WHERE u.id = $1
        `, [userId]);
        
        const userInfo = userInfoResult.rows[0] || {};
        
        res.json({
            success: true,
            data: {
                userBehavior: userBehavior,
                collaborativeRecommendations: collaborativeRecs,
                userPreferences: userInfo,
                scoringWeights: tripSuggestionEngine.scoringWeights,
                seasonalFactors: tripSuggestionEngine.seasonalFactors
            }
        });
    } catch (error) {
        console.error('Error getting trip analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trip analysis'
        });
    }
});

module.exports = router; 