const express = require('express');
const router = express.Router();
const UnifiedTicketingService = require('../services/unifiedTicketingService');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const ticketingService = new UnifiedTicketingService();

/**
 * @route GET /api/ticketing/search
 * @desc Search tickets across all providers
 * @access Private
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { 
            eventId, 
            eventName, 
            venueName, 
            eventDate, 
            maxResults = 10, 
            preferredProvider 
        } = req.query;

        logger.info(`[TicketingRoute] Ticket search request`, {
            eventId,
            eventName,
            venueName,
            eventDate,
            maxResults,
            preferredProvider,
            userId: req.user.id
        });
        console.log('[TicketingRoute] Ticket search request params:', req.query);

        const results = await ticketingService.searchTickets(
            eventId,
            eventName,
            venueName,
            eventDate,
            parseInt(maxResults),
            preferredProvider
        );

        logger.info(`[TicketingRoute] Ticket search results:`, results);
        console.log('[TicketingRoute] Ticket search results:', JSON.stringify(results, null, 2));

        res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        logger.error(`[TicketingRoute] Ticket search error: ${error.message}`);
        console.error('[TicketingRoute] Ticket search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search tickets',
            error: error.message,
            stack: error.stack,
            fullError: error
        });
    }
});

/**
 * @route GET /api/ticketing/providers
 * @desc Get available ticketing providers
 * @access Public
 */
router.get('/providers', async (req, res) => {
    try {
        const availableProviders = await ticketingService.getAvailableProviders();
        
        res.status(200).json({
            success: true,
            data: {
                available: availableProviders,
                all: ['ticketmaster', 'eventbrite', 'stubhub', 'vividseats', 'axs']
            }
        });

    } catch (error) {
        logger.error(`Get providers error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get providers',
            error: error.message
        });
    }
});

/**
 * @route GET /api/ticketing/health
 * @desc Get health status of all ticketing providers
 * @access Private
 */
router.get('/health', authenticateToken, async (req, res) => {
    try {
        const healthStatus = await ticketingService.getProviderHealth();
        
        res.status(200).json({
            success: true,
            data: healthStatus
        });

    } catch (error) {
        logger.error(`Health check error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to check provider health',
            error: error.message
        });
    }
});

/**
 * @route GET /api/ticketing/compare
 * @desc Compare ticket prices across providers
 * @access Private
 */
router.get('/compare', authenticateToken, async (req, res) => {
    try {
        const { eventId, eventName, venueName, eventDate } = req.query;

        if (!eventId && !eventName) {
            return res.status(400).json({
                success: false,
                message: 'Either eventId or eventName is required'
            });
        }

        logger.info(`Price comparison request`, {
            eventId,
            eventName,
            venueName,
            eventDate,
            userId: req.user.id
        });

        const comparison = await ticketingService.compareTicketPrices(
            eventId,
            eventName,
            venueName,
            eventDate
        );

        res.status(200).json({
            success: true,
            data: comparison
        });

    } catch (error) {
        logger.error(`Price comparison error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to compare prices',
            error: error.message
        });
    }
});

/**
 * @route GET /api/ticketing/trending
 * @desc Get trending events across all providers
 * @access Public
 */
router.get('/trending', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const trendingEvents = await ticketingService.getTrendingEvents(parseInt(limit));

        res.status(200).json({
            success: true,
            data: trendingEvents
        });

    } catch (error) {
        logger.error(`Trending events error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending events',
            error: error.message
        });
    }
});

/**
 * @route GET /api/ticketing/details/:provider/:ticketId
 * @desc Get detailed ticket information from specific provider
 * @access Private
 */
router.get('/details/:provider/:ticketId', authenticateToken, async (req, res) => {
    try {
        const { provider, ticketId } = req.params;

        logger.info(`Ticket details request`, {
            provider,
            ticketId,
            userId: req.user.id
        });

        const details = await ticketingService.getTicketDetails(provider, ticketId);

        res.status(200).json({
            success: true,
            data: details
        });

    } catch (error) {
        logger.error(`Ticket details error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get ticket details',
            error: error.message
        });
    }
});

/**
 * @route GET /api/ticketing/stats
 * @desc Get ticketing service statistics
 * @access Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const availableProviders = await ticketingService.getAvailableProviders();
        const healthStatus = await ticketingService.getProviderHealth();

        const stats = {
            totalProviders: 5,
            availableProviders: availableProviders.length,
            providerStatus: healthStatus,
            lastUpdated: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error(`Stats error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics',
            error: error.message
        });
    }
});

module.exports = router; 