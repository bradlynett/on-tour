const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const TripSuggestionEngine = require('../services/tripSuggestionEngine');
const tripEngine = require('../services/tripSuggestionEngine');

// Debug middleware to log all requests to trips router
router.use((req, res, next) => {
    console.log('🔍 Trips router hit:', req.method, req.url, req.path);
    next();
});

// Get all trip suggestions for the user (handle all variations)
router.get(['/', '', '/index', '/list'], authenticateToken, async (req, res) => {
    console.log('🎯 GET /api/trips route hit');
    console.log('User ID:', req.user.id);
    console.log('Query params:', req.query);
    console.log('Request URL:', req.url);
    console.log('Request path:', req.path);
    
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);
        
        // Use enhanced trip suggestions from the engine
        let allSuggestions = await TripSuggestionEngine.getEnhancedTripSuggestions(req.user.id, parsedLimit);
        // Ensure all components are formatted (in case engine is bypassed)
        allSuggestions = allSuggestions.map(suggestion => ({
            ...suggestion,
            components: (suggestion.components || []).map(comp => ({
                ...comp,
                details: tripEngine.constructor.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
            }))
        }));
        if (status) {
            allSuggestions = allSuggestions.filter(s => s.status === status);
        }
        const total = allSuggestions.length;
        const pages = Math.ceil(total / parsedLimit);
        const offset = (parsedPage - 1) * parsedLimit;
        const suggestions = allSuggestions.slice(offset, offset + parsedLimit);

        res.json({
            success: true,
            data: {
                suggestions,
                pagination: {
                    page: parsedPage,
                    limit: parsedLimit,
                    total,
                    pages
                }
            }
        });
    } catch (error) {
        console.error('❌ Failed to get trip suggestions:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to get trip suggestions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Generate new trip suggestions for the user
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { limit = 5 } = req.body;
        
        console.log(`🎯 Generating trip suggestions for user ${req.user.id}`);
        
        let result = await TripSuggestionEngine.generateTripSuggestions(req.user.id, limit);
        // Ensure all components are formatted
        result = result.map(suggestion => ({
            ...suggestion,
            components: (suggestion.components || []).map(comp => ({
                ...comp,
                details: tripEngine.constructor.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
            }))
        }));
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Failed to generate trip suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate trip suggestions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get trip suggestions statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        // Get overall statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_suggestions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_suggestions,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_suggestions,
                COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked_suggestions,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_suggestions,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_suggestions,
                AVG(total_cost) as avg_total_cost,
                SUM(total_cost) as total_spent,
                AVG(service_fee) as avg_service_fee
            FROM trip_suggestions
            WHERE user_id = $1
        `, [req.user.id]);

        // Get recent suggestions
        const recentResult = await pool.query(`
            SELECT ts.id, ts.status, ts.total_cost, ts.created_at,
                   e.name as event_name, e.artist, e.venue_city, e.event_date
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            WHERE ts.user_id = $1
            ORDER BY ts.created_at DESC
            LIMIT 5
        `, [req.user.id]);

        // Get top events by suggestion count
        const topEventsResult = await pool.query(`
            SELECT e.name as event_name, e.artist, e.venue_city,
                   COUNT(ts.id) as suggestion_count
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            WHERE ts.user_id = $1
            GROUP BY e.id, e.name, e.artist, e.venue_city
            ORDER BY suggestion_count DESC
            LIMIT 5
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                statistics: statsResult.rows[0],
                recentSuggestions: recentResult.rows,
                topEvents: topEventsResult.rows
            }
        });
    } catch (error) {
        console.error('❌ Failed to get trip statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trip statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get in-progress trip suggestions for the user (progressive polling)
router.get('/in-progress', authenticateToken, async (req, res) => {
    try {
        let suggestions = await TripSuggestionEngine.getInProgressTripSuggestions(req.user.id);
        // Ensure all components are formatted
        suggestions = suggestions.map(suggestion => ({
            ...suggestion,
            components: (suggestion.components || []).map(comp => ({
                ...comp,
                details: tripEngine.constructor.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
            }))
        }));
        res.json({
            success: true,
            data: { suggestions }
        });
    } catch (error) {
        console.error('❌ Failed to get in-progress trip suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get in-progress trip suggestions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/trips/feedback - get all feedback for the user
router.get('/feedback', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT trip_suggestion_id, feedback, created_at FROM user_trip_feedback WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Failed to get all trip feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to get feedback' });
    }
});

// Get a specific trip suggestion by ID
router.get('/:id', authenticateToken, async (req, res) => {
    console.log('🎯 GET /api/trips/:id route hit', req.params.id);
    try {
        const { id } = req.params;
        
        const suggestion = await TripSuggestionEngine.getTripSuggestionWithDetails(id);
        // Ensure all components are formatted
        suggestion.components = (suggestion.components || []).map(comp => ({
            ...comp,
            details: tripEngine.constructor.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
        }));
        
        // Check if the suggestion belongs to the user
        if (suggestion.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: {
                suggestion
            }
        });
    } catch (error) {
        console.error('❌ Failed to get trip suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trip suggestion',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update trip suggestion status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected', 'booked', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: pending, approved, rejected, booked, cancelled'
            });
        }

        // Check if suggestion exists and belongs to user
        const existingResult = await pool.query(`
            SELECT user_id FROM trip_suggestions WHERE id = $1
        `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Trip suggestion not found'
            });
        }

        if (existingResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Update status
        const result = await pool.query(`
            UPDATE trip_suggestions 
            SET status = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id, status]);

        // Get updated suggestion with details
        const updatedSuggestion = await TripSuggestionEngine.getTripSuggestionWithDetails(id);

        res.json({
            success: true,
            data: {
                suggestion: updatedSuggestion
            },
            message: `Trip suggestion status updated to ${status}`
        });
    } catch (error) {
        console.error('❌ Failed to update trip suggestion status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update trip suggestion status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Create a new trip suggestion for a specific event
router.post('/event/:eventId', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Check if event exists
        const eventResult = await pool.query(`
            SELECT id FROM events WHERE id = $1
        `, [eventId]);

        if (eventResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Get user travel preferences
        const preferencesResult = await pool.query(`
            SELECT primary_airport, preferred_airlines, flight_class, 
                   preferred_hotel_brands, rental_car_preference
            FROM travel_preferences 
            WHERE user_id = $1
        `, [req.user.id]);

        const preferences = preferencesResult.rows[0] || {};

        // Create trip suggestion
        let suggestion = await TripSuggestionEngine.createTripSuggestion(req.user.id, eventId, preferences);
        // Ensure all components are formatted
        suggestion.components = (suggestion.components || []).map(comp => ({
            ...comp,
            details: tripEngine.constructor.formatComponentDetails(comp.component_type || comp.componentType, comp.details) 
        }));

        res.json({
            success: true,
            data: {
                suggestion
            },
            message: 'Trip suggestion created successfully'
        });
    } catch (error) {
        console.error('❌ Failed to create trip suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create trip suggestion',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// POST /api/trips/:id/feedback - submit feedback for a trip suggestion
router.post('/:id/feedback', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;
        const validFeedback = ['double_up', 'up', 'down'];
        if (feedback === null) {
            // Remove feedback
            await pool.query(
                'DELETE FROM user_trip_feedback WHERE user_id = $1 AND trip_suggestion_id = $2',
                [req.user.id, id]
            );
            return res.json({ success: true, message: 'Feedback removed' });
        }
        if (!validFeedback.includes(feedback)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid feedback. Must be one of: double_up, up, down'
            });
        }
        // Check if trip suggestion belongs to user
        const tripResult = await pool.query(
            'SELECT user_id FROM trip_suggestions WHERE id = $1',
            [id]
        );
        if (tripResult.rows.length === 0 || tripResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied or trip suggestion not found'
            });
        }
        // Upsert feedback
        await pool.query(
            `INSERT INTO user_trip_feedback (user_id, trip_suggestion_id, feedback)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, trip_suggestion_id) DO UPDATE SET feedback = EXCLUDED.feedback, created_at = CURRENT_TIMESTAMP`,
            [req.user.id, id, feedback]
        );
        res.json({ success: true, message: 'Feedback saved' });
    } catch (error) {
        console.error('Failed to save trip feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to save feedback' });
    }
});

// GET /api/trips/:id/feedback - get feedback for a specific trip
router.get('/:id/feedback', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT feedback FROM user_trip_feedback WHERE user_id = $1 AND trip_suggestion_id = $2',
            [req.user.id, id]
        );
        if (result.rows.length === 0) {
            return res.json({ success: true, data: { feedback: null } });
        }
        res.json({ success: true, data: { feedback: result.rows[0].feedback } });
    } catch (error) {
        console.error('Failed to get trip feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to get feedback' });
    }
});

// Save a trip suggestion for later
router.post('/:id/save', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if trip suggestion belongs to user
        const tripResult = await pool.query(
            'SELECT user_id FROM trip_suggestions WHERE id = $1',
            [id]
        );
        if (tripResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Trip suggestion not found' });
        }
        // Allow saving any trip (not just user's own)
        await pool.query(
            `INSERT INTO user_saved_trips (user_id, trip_suggestion_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, trip_suggestion_id) DO NOTHING`,
            [req.user.id, id]
        );
        res.json({ success: true, message: 'Trip saved for later' });
    } catch (error) {
        console.error('Failed to save trip:', error);
        res.status(500).json({ success: false, message: 'Failed to save trip' });
    }
});

// Unsave a trip suggestion
router.delete('/:id/save', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'DELETE FROM user_saved_trips WHERE user_id = $1 AND trip_suggestion_id = $2',
            [req.user.id, id]
        );
        res.json({ success: true, message: 'Trip unsaved' });
    } catch (error) {
        console.error('Failed to unsave trip:', error);
        res.status(500).json({ success: false, message: 'Failed to unsave trip' });
    }
});

// Get all saved trips for the user
router.get('/saved', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ts.* FROM user_saved_trips ust
             JOIN trip_suggestions ts ON ust.trip_suggestion_id = ts.id
             WHERE ust.user_id = $1`,
            [req.user.id]
        );
        res.json({ success: true, data: { savedTrips: result.rows } });
    } catch (error) {
        console.error('Failed to get saved trips:', error);
        res.status(500).json({ success: false, message: 'Failed to get saved trips' });
    }
});

// Delete a trip suggestion
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if suggestion exists and belongs to user
        const existingResult = await pool.query(`
            SELECT user_id, status FROM trip_suggestions WHERE id = $1
        `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Trip suggestion not found'
            });
        }

        if (existingResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Prevent deletion of booked trips
        if (existingResult.rows[0].status === 'booked') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a booked trip suggestion'
            });
        }

        // Delete trip components first (cascade should handle this, but being explicit)
        await pool.query(`
            DELETE FROM trip_components WHERE trip_suggestion_id = $1
        `, [id]);

        // Delete trip suggestion
        await pool.query(`
            DELETE FROM trip_suggestions WHERE id = $1
        `, [id]);

        res.json({
            success: true,
            message: 'Trip suggestion deleted successfully'
        });
    } catch (error) {
        console.error('❌ Failed to delete trip suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete trip suggestion',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;