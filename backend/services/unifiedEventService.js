const { pool } = require('../config/database');
const EventProviderInterface = require('./eventProviderInterface');
const ticketmasterProvider = require('./eventService');
const eventbriteProvider = require('./eventbriteService');

class UnifiedEventService {
    constructor() {
        this.providers = {
            ticketmaster: ticketmasterProvider,
            eventbrite: eventbriteProvider
        };
    }

    // Get all events from unified database (merged from all sources)
    async getAllEvents(options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                artist = '',
                venue = '',
                city = '',
                startDate = '',
                endDate = '',
                source = '', // Optional: filter by source
                eventType = '', // Add event_type filter
                eventSubtype = '' // Add event_subtype filter
            } = options;

            let query = `
                SELECT * FROM events 
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            if (artist) {
                query += ` AND artist ILIKE $${paramCount++}`;
                params.push(`%${artist}%`);
            }

            if (venue) {
                query += ` AND venue_name ILIKE $${paramCount++}`;
                params.push(`%${venue}%`);
            }

            if (city) {
                query += ` AND venue_city ILIKE $${paramCount++}`;
                params.push(`%${city}%`);
            }

            if (startDate) {
                query += ` AND event_date >= $${paramCount++}`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND event_date <= $${paramCount++}`;
                params.push(endDate);
            }

            if (source) {
                query += ` AND external_id LIKE $${paramCount++}`;
                params.push(`${source}_%`);
            }

            if (eventType) {
                query += ` AND event_type = $${paramCount++}`;
                params.push(eventType);
            }
            if (eventSubtype) {
                query += ` AND event_subtype = $${paramCount++}`;
                params.push(eventSubtype);
            }

            query += ` ORDER BY event_date ASC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting unified events:', error);
            throw new Error('Failed to get unified events');
        }
    }

    // Search events across all sources and merge results
    async searchAllSources(options = {}) {
        const allEvents = [];
        const seenEvents = new Set(); // Track by name + venue + date to avoid duplicates

        console.log('🔍 Searching all event sources...');

        for (const [providerName, provider] of Object.entries(this.providers)) {
            try {
                const result = await provider.searchEvents(options);
                result.events.forEach(event => {
                    const key = `${event.name}_${event.venueName}_${event.eventDate}`;
                    if (!seenEvents.has(key)) {
                        seenEvents.add(key);
                        allEvents.push({ ...event, source: providerName });
                    }
                });
            } catch (error) {
                console.log(`⚠️ ${providerName} search failed:`, error.message);
            }
        }

        // Sort by date and return
        allEvents.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
        
        console.log(`🎉 Total unique events found: ${allEvents.length}`);
        return {
            events: allEvents,
            sources: Object.keys(this.providers),
            totalFound: allEvents.length
        };
    }

    async healthCheck() {
        const health = {};
        for (const [providerName, provider] of Object.entries(this.providers)) {
            try {
                health[providerName] = await provider.healthCheck();
            } catch (error) {
                health[providerName] = { status: 'unhealthy', error: error.message };
            }
        }
        return health;
    }

    // Get events matching user interests (for trip suggestions)
    async getEventsForUser(userId, limit = 10) {
        try {
            console.log(`🎯 Getting events for user ${userId} based on interests...`);
            
            // Get user interests
            const interestsResult = await pool.query(`
                SELECT interest_type, interest_value, priority
                FROM user_interests 
                WHERE user_id = $1
                ORDER BY priority ASC
            `, [userId]);

            if (interestsResult.rows.length === 0) {
                console.log('No interests found for user');
                return [];
            }

            const matchingEvents = [];
            const seenEventIds = new Set();

            // Find matching events for each interest
            for (const interest of interestsResult.rows) {
                const events = await this.findEventsByInterest(interest, limit);
                
                events.forEach(event => {
                    if (!seenEventIds.has(event.id)) {
                        seenEventIds.add(event.id);
                        matchingEvents.push(event);
                    }
                });
            }

            // Sort by date and return top matches
            matchingEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
            return matchingEvents.slice(0, limit);

        } catch (error) {
            console.error('❌ Error getting events for user:', error);
            return [];
        }
    }

    // Find events by specific interest
    async findEventsByInterest(interest, limit = 10) {
        let query = `
            SELECT id, external_id, name, artist, venue_name, venue_city, venue_state, 
                   event_date, ticket_url, min_price, max_price, created_at
            FROM events 
            WHERE event_date >= CURRENT_DATE
        `;
        const params = [];

        switch (interest.interest_type) {
            case 'artist': {
                // Enhanced artist matching with fuzzy logic
                const artistName = interest.interest_value;
                const cleanArtistName = this.cleanArtistName(artistName);
                const nameWithoutQuotes = artistName.replace(/"/g, '');
                const nameWithQuotes = artistName.includes('"') ? artistName : `"${artistName}"`;
                const patterns = [cleanArtistName, artistName];
                if (nameWithoutQuotes !== artistName) patterns.push(nameWithoutQuotes);
                patterns.push(nameWithQuotes);
                // Build OR conditions and params
                const orConditions = patterns.map((_, idx) => `LOWER(artist) LIKE LOWER($${idx + 1})`).join(' OR ');
                patterns.forEach(p => params.push(`%${p}%`));
                query += ` AND (${orConditions})`;
                break;
            }
            case 'venue':
                params.push(`%${interest.interest_value}%`);
                query += ` AND LOWER(venue_name) LIKE LOWER($${params.length})`;
                break;
            case 'city':
                params.push(`%${interest.interest_value}%`);
                query += ` AND LOWER(venue_city) LIKE LOWER($${params.length})`;
                break;
            default:
                return []; // Unsupported interest type
        }

        query += ` ORDER BY event_date ASC LIMIT $${params.length + 1}`;
        params.push(limit);

        try {
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error(`Error finding events for interest ${interest.interest_value}:`, error);
            return [];
        }
    }

    // Clean artist name for better matching
    cleanArtistName(artistName) {
        return artistName
            .replace(/"/g, '') // Remove quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    // Get upcoming events preview (for dashboard)
    async getUpcomingPreview(userId, limit = 5) {
        try {
            // First try to get events based on user interests
            let events = await this.getEventsForUser(userId, limit);
            
            // If not enough events, fill with general upcoming events
            if (events.length < limit) {
                const generalEvents = await this.getAllEvents({
                    limit: limit - events.length,
                    startDate: new Date().toISOString()
                });
                
                // Avoid duplicates
                const existingIds = new Set(events.map(e => e.id));
                generalEvents.forEach(event => {
                    if (!existingIds.has(event.id)) {
                        events.push(event);
                    }
                });
            }

            return events.slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting upcoming preview:', error);
            return [];
        }
    }

    // Get event statistics
    async getEventStats() {
        try {
            const stats = await pool.query(`
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT artist) as unique_artists,
                    COUNT(DISTINCT venue_city) as unique_cities,
                    COUNT(DISTINCT CASE WHEN external_id LIKE 'ticketmaster_%' THEN id END) as ticketmaster_events,
                    COUNT(DISTINCT CASE WHEN external_id LIKE 'eventbrite_%' THEN id END) as eventbrite_events,
                    MIN(event_date) as earliest_event,
                    MAX(event_date) as latest_event
                FROM events 
                WHERE event_date >= CURRENT_DATE
            `);

            return stats.rows[0];
        } catch (error) {
            console.error('❌ Error getting event stats:', error);
            return {};
        }
    }

    // Clean up old events (older than 30 days)
    async cleanupOldEvents() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const result = await pool.query(`
                DELETE FROM events 
                WHERE event_date < $1
            `, [thirtyDaysAgo.toISOString()]);

            console.log(`🧹 Cleaned up ${result.rowCount} old events`);
            return result.rowCount;
        } catch (error) {
            console.error('❌ Error cleaning up old events:', error);
            return 0;
        }
    }
}

module.exports = new UnifiedEventService(); 