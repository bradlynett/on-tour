const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const EventScraper = require('../services/eventscraper');

// Initialize event scraper
const eventScraper = new EventScraper();

// Get all events from database
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit, offset, artist, venue, city, startDate, endDate } = req.query;
        
        const events = await eventService.getEvents({
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
            artist,
            venue,
            city,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: events,
            count: events.length
        });
    } catch (error) {
        console.error('❌ Error getting events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get events',
            error: error.message
        });
    }
});

// Search events from Ticketmaster API
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const {
            keyword,
            city,
            state,
            country,
            startDateTime,
            endDateTime,
            size,
            page,
            classificationName,
            sort
        } = req.query;

        const result = await eventService.searchEvents({
            keyword,
            city,
            state,
            country,
            startDateTime,
            endDateTime,
            size: parseInt(size) || 20,
            page: parseInt(page) || 0,
            classificationName: classificationName || 'music',
            sort: sort || 'date,asc'
        });

        res.json({
            success: true,
            data: result.events,
            pagination: {
                page: result.page,
                totalElements: result.totalElements,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('❌ Error searching events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search events',
            error: error.message
        });
    }
});

// Search events by artist
router.get('/search/artist/:artistName', authenticateToken, async (req, res) => {
    try {
        const { artistName } = req.params;
        const { city, state, startDateTime, endDateTime, size, page } = req.query;

        const result = await eventService.searchEventsByArtist(artistName, {
            city,
            state,
            startDateTime,
            endDateTime,
            size: parseInt(size) || 20,
            page: parseInt(page) || 0
        });

        res.json({
            success: true,
            data: result.events,
            pagination: {
                page: result.page,
                totalElements: result.totalElements,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('❌ Error searching events by artist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search events by artist',
            error: error.message
        });
    }
});

// Search events by venue
router.get('/search/venue/:venueName', authenticateToken, async (req, res) => {
    try {
        const { venueName } = req.params;
        const { city, state, startDateTime, endDateTime, size, page } = req.query;

        const result = await eventService.searchEventsByVenue(venueName, {
            city,
            state,
            startDateTime,
            endDateTime,
            size: parseInt(size) || 20,
            page: parseInt(page) || 0
        });

        res.json({
            success: true,
            data: result.events,
            pagination: {
                page: result.page,
                totalElements: result.totalElements,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('❌ Error searching events by venue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search events by venue',
            error: error.message
        });
    }
});

// Search events by city
router.get('/search/city/:city', authenticateToken, async (req, res) => {
    try {
        const { city } = req.params;
        const { state, startDateTime, endDateTime, size, page } = req.query;

        const result = await eventService.searchEventsByCity(city, state, {
            startDateTime,
            endDateTime,
            size: parseInt(size) || 20,
            page: parseInt(page) || 0
        });

        res.json({
            success: true,
            data: result.events,
            pagination: {
                page: result.page,
                totalElements: result.totalElements,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('❌ Error searching events by city:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search events by city',
            error: error.message
        });
    }
});

// Get upcoming events
router.get('/upcoming', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, size, page } = req.query;
        
        // Default to next 3 months if no dates provided
        const defaultStartDate = new Date().toISOString();
        const defaultEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        const result = await eventService.getUpcomingEvents(
            startDate || defaultStartDate,
            endDate || defaultEndDate,
            {
                size: parseInt(size) || 20,
                page: parseInt(page) || 0
            }
        );

        res.json({
            success: true,
            data: result.events,
            pagination: {
                page: result.page,
                totalElements: result.totalElements,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('❌ Error getting upcoming events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get upcoming events',
            error: error.message
        });
    }
});

// Get event details by external ID
router.get('/:eventId', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await eventService.getEventDetails(eventId);
        
        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('❌ Error getting event details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get event details',
            error: error.message
        });
    }
});

// Save event to database
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const eventData = req.body;
        const eventId = await eventService.saveEvent(eventData);
        
        res.json({
            success: true,
            message: 'Event saved successfully',
            data: { id: eventId }
        });
    } catch (error) {
        console.error('❌ Error saving event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save event',
            error: error.message
        });
    }
});

// Save multiple events to database
router.post('/save/bulk', authenticateToken, async (req, res) => {
    try {
        const { events } = req.body;
        
        if (!Array.isArray(events)) {
            return res.status(400).json({
                success: false,
                message: 'Events must be an array'
            });
        }

        const savedIds = await eventService.saveEvents(events);
        
        res.json({
            success: true,
            message: `Saved ${savedIds.length} events successfully`,
            data: { savedIds, count: savedIds.length }
        });
    } catch (error) {
        console.error('❌ Error saving events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save events',
            error: error.message
        });
    }
});

// Sync events from Ticketmaster API to database
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const { keyword, city, state, size = 50 } = req.body;
        
        console.log('🔄 Starting event sync...');
        
        const result = await eventService.searchEvents({
            keyword,
            city,
            state,
            size: parseInt(size)
        });

        if (result.events.length === 0) {
            return res.json({
                success: true,
                message: 'No events found to sync',
                data: { savedCount: 0 }
            });
        }

        const savedIds = await eventService.saveEvents(result.events);
        
        console.log(`✅ Synced ${savedIds.length} events to database`);
        
        res.json({
            success: true,
            message: `Synced ${savedIds.length} events successfully`,
            data: { 
                savedCount: savedIds.length,
                totalFound: result.events.length
            }
        });
    } catch (error) {
        console.error('❌ Error syncing events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync events',
            error: error.message
        });
    }
});

// Manual event scraping trigger (admin only)
router.post('/scrape', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin (you can implement admin role checking)
        // For now, we'll allow any authenticated user to trigger scraping
        
        const { providers = ['ticketmaster', 'livenation'] } = req.body;
        
        console.log('🎫 Starting manual event scraping for providers:', providers);
        
        // Start scraping in background
        eventScraper.scrapeAllProviders()
            .then(events => {
                console.log(`✅ Scraping completed. Found ${events.length} events`);
                return eventScraper.saveEvents(events);
            })
            .then(() => {
                console.log('✅ Events saved to database');
            })
            .catch(error => {
                console.error('❌ Scraping failed:', error);
            });

        res.json({
            success: true,
            message: 'Event scraping started in background',
            providers
        });
    } catch (error) {
        console.error('Manual scraping error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start event scraping',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Enrich all events with SeatGeek and Ticketmaster event IDs (admin only)
router.post('/enrich-external-ids', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { pool } = require('../config/database');
        const axios = require('axios');
        const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;
        const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
        if (!SEATGEEK_CLIENT_ID || !TICKETMASTER_API_KEY) {
            return res.status(500).json({ success: false, message: 'Missing SeatGeek or Ticketmaster API credentials in environment.' });
        }
        const eventsRes = await pool.query('SELECT id, name, artist, event_date, venue_name, venue_city, venue_state FROM events');
        const events = eventsRes.rows;
        let updated = 0;
        for (const event of events) {
            // SeatGeek
            let seatgeekId = null;
            try {
                const q = encodeURIComponent(`${event.artist || ''} ${event.name} ${event.venue_name || ''}`.trim());
                const date = event.event_date.toISOString().split('T')[0];
                const url = `https://api.seatgeek.com/2/events?q=${q}&datetime_utc=${date}&venue.city=${encodeURIComponent(event.venue_city || '')}&venue.state=${encodeURIComponent(event.venue_state || '')}&client_id=${SEATGEEK_CLIENT_ID}`;
                const resp = await axios.get(url);
                if (resp.data.events && resp.data.events.length > 0) {
                    const match = resp.data.events.find(e => {
                        const eventDate = e.datetime_utc ? e.datetime_utc.split('T')[0] : '';
                        return eventDate === date && e.venue && e.venue.name && e.venue.name.toLowerCase().includes((event.venue_name || '').toLowerCase());
                    }) || resp.data.events[0];
                    seatgeekId = match ? match.id : null;
                }
            } catch (err) {
                console.error(`SeatGeek lookup failed for event ${event.id}: ${err.message}`);
            }
            // Ticketmaster
            let ticketmasterId = null;
            try {
                const keyword = encodeURIComponent(`${event.artist || ''} ${event.name}`.trim());
                const date = event.event_date.toISOString().split('T')[0];
                const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&keyword=${keyword}&venue=${encodeURIComponent(event.venue_name || '')}&city=${encodeURIComponent(event.venue_city || '')}&stateCode=${encodeURIComponent(event.venue_state || '')}&startDateTime=${date}T00:00:00Z&endDateTime=${date}T23:59:59Z`;
                const resp = await axios.get(url);
                if (resp.data._embedded && resp.data._embedded.events && resp.data._embedded.events.length > 0) {
                    const match = resp.data._embedded.events.find(e => {
                        const eventDate = e.dates && e.dates.start && e.dates.start.localDate;
                        return eventDate === date && e._embedded && e._embedded.venues && e._embedded.venues[0].name && e._embedded.venues[0].name.toLowerCase().includes((event.venue_name || '').toLowerCase());
                    }) || resp.data._embedded.events[0];
                    ticketmasterId = match ? match.id : null;
                }
            } catch (err) {
                console.error(`Ticketmaster lookup failed for event ${event.id}: ${err.message}`);
            }
            // Update DB
            await pool.query('UPDATE events SET seatgeek_event_id = $1, ticketmaster_event_id = $2 WHERE id = $3', [seatgeekId, ticketmasterId, event.id]);
            updated++;
        }
        res.json({ success: true, message: `Enriched ${updated} events with external IDs.` });
    } catch (err) {
        console.error('Enrichment endpoint failed:', err);
        res.status(500).json({ success: false, message: 'Enrichment failed', error: err.message });
    }
});

// Get scraping status and statistics
router.get('/stats/scraping', authenticateToken, async (req, res) => {
    try {
        // Get event statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(CASE WHEN event_date >= CURRENT_DATE THEN 1 END) as upcoming_events,
                COUNT(CASE WHEN event_date < CURRENT_DATE THEN 1 END) as past_events,
                MIN(event_date) as earliest_event,
                MAX(event_date) as latest_event,
                AVG(min_price) as avg_min_price,
                AVG(max_price) as avg_max_price
            FROM events
        `);

        // Get events by provider (external_id pattern)
        const providerStats = await pool.query(`
            SELECT 
                CASE 
                    WHEN external_id LIKE 'tm_%' THEN 'Ticketmaster'
                    WHEN external_id LIKE 'ln_%' THEN 'Live Nation'
                    WHEN external_id LIKE 'sh_%' THEN 'StubHub'
                    WHEN external_id LIKE 'vs_%' THEN 'Vivid Seats'
                    ELSE 'Other'
                END as provider,
                COUNT(*) as count
            FROM events 
            WHERE external_id IS NOT NULL
            GROUP BY provider
            ORDER BY count DESC
        `);

        res.json({
            success: true,
            data: {
                statistics: statsResult.rows[0],
                providers: providerStats.rows
            }
        });
    } catch (error) {
        console.error('Get scraping stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scraping statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
