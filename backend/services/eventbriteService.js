const axios = require('axios');
const EventProviderInterface = require('./eventProviderInterface');

class EventbriteService extends EventProviderInterface {
    constructor() {
        super();
        this.apiKey = process.env.EVENTBRITE_API_KEY;
        this.baseUrl = 'https://www.eventbriteapi.com/v3';
        
        if (!this.apiKey) {
            console.warn('⚠️  EVENTBRITE_API_KEY not found in environment variables');
        }
    }

    async searchEvents(options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('Eventbrite API key not configured');
            }

            const {
                keyword = '',
                location = '',
                startDate = '',
                endDate = '',
                size = 20,
                page = 1
            } = options;

            const params = {
                token: this.apiKey,
                'page_size': Math.min(size, 50), // Eventbrite max is 50
                page: page,
                'expand': 'venue,ticket_availability'
            };

            // Add optional filters
            if (keyword) params.q = keyword;
            if (location) params.location_address = location;
            if (startDate) params['start_date.range_start'] = startDate;
            if (endDate) params['start_date.range_end'] = endDate;

            // Add eventType and eventSubtype filters
            if (options.eventType) params.eventType = options.eventType;
            if (options.eventSubtype) params.eventSubtype = options.eventSubtype;

            console.log('🔍 Searching Eventbrite API with params:', { ...params, token: '[HIDDEN]' });

            const response = await axios.get(`${this.baseUrl}/events/search/`, { params });
            
            if (response.data.events) {
                const events = response.data.events.map(event => this.formatEvent(event));
                return {
                    events,
                    pagination: response.data.pagination
                };
            } else {
                return {
                    events: [],
                    pagination: { page_count: 0, page_number: page }
                };
            }
        } catch (error) {
            console.error('❌ Error searching Eventbrite events:', error.response?.data || error.message);
            throw new Error('Failed to search Eventbrite events');
        }
    }

    // Format Eventbrite event data to our unified schema
    formatEvent(eventbriteEvent) {
        const eventType = (eventbriteEvent.category_id && this.mapCategoryToType(eventbriteEvent.category_id)) || 'music';
        const eventSubtype = eventbriteEvent.subcategory_id || null;
        const venueType = eventbriteEvent.venue?.type || null;
        const specialVenue = false; // Could add logic for special venues
        const eventMetadata = {
            originalCategory: eventbriteEvent.category_id,
            originalSubcategory: eventbriteEvent.subcategory_id,
            organizer: eventbriteEvent.organizer,
            info: eventbriteEvent.description?.text || ''
        };
        const event = {
            externalId: `eventbrite_${eventbriteEvent.id}`,
            name: eventbriteEvent.name?.text || '',
            artist: this.extractArtist(eventbriteEvent),
            venueName: eventbriteEvent.venue?.name || '',
            venueCity: eventbriteEvent.venue?.address?.city || '',
            venueState: eventbriteEvent.venue?.address?.region || '',
            venueAddress: eventbriteEvent.venue?.address?.address_1 || '',
            venuePostalCode: eventbriteEvent.venue?.address?.postal_code || '',
            eventDate: eventbriteEvent.start?.utc || eventbriteEvent.start?.local,
            ticketUrl: eventbriteEvent.url,
            minPrice: this.extractMinPrice(eventbriteEvent),
            maxPrice: this.extractMaxPrice(eventbriteEvent),
            currency: 'USD',
            status: eventbriteEvent.status || 'unknown',
            images: eventbriteEvent.logo ? [{
                url: eventbriteEvent.logo.url,
                width: eventbriteEvent.logo.crop_mask?.width || 0,
                height: eventbriteEvent.logo.crop_mask?.height || 0
            }] : [],
            classifications: [],
            promoter: eventbriteEvent.organizer?.name || '',
            info: eventbriteEvent.description?.text || '',
            pleaseNote: '',
            priceRanges: [],
            seatmap: '',
            accessibility: {},
            ticketLimit: '',
            createdAt: new Date().toISOString(),
            eventType,
            eventSubtype,
            venueType,
            specialVenue,
            eventMetadata
        };
        return event;
    }
    mapCategoryToType(categoryId) {
        // Map Eventbrite category IDs to event types
        const map = {
            '103': 'music',
            '108': 'sports',
            '105': 'comedy',
            '104': 'theater', // Arts/Entertainment
            '110': 'family',
            '102': 'other', // Business
            '109': 'other', // Education
            '111': 'other', // Film/Media
            '113': 'other', // Food/Drink
            '114': 'other', // Health/Wellness
            '115': 'other', // Other
            // Add more mappings as needed
        };
        return map[categoryId] || 'other';
    }

    // Extract artist name from event
    extractArtist(event) {
        // Try to extract artist from event name or description
        const name = event.name?.text || '';
        
        // Common patterns for artist names in event titles
        if (name.includes(' - ')) {
            return name.split(' - ')[0].trim();
        }
        if (name.includes(': ')) {
            return name.split(': ')[0].trim();
        }
        if (name.includes(' at ')) {
            return name.split(' at ')[0].trim();
        }
        
        // If no clear pattern, return empty (will be handled by deduplication)
        return '';
    }

    // Extract minimum price
    extractMinPrice(event) {
        if (event.ticket_availability && event.ticket_availability.minimum_ticket_price) {
            return event.ticket_availability.minimum_ticket_price.major_value;
        }
        return null;
    }

    // Extract maximum price
    extractMaxPrice(event) {
        if (event.ticket_availability && event.ticket_availability.maximum_ticket_price) {
            return event.ticket_availability.maximum_ticket_price.major_value;
        }
        return null;
    }

    // Search events by artist
    async searchEventsByArtist(artistName, options = {}) {
        return this.searchEvents({
            keyword: artistName,
            ...options
        });
    }

    // Search events by location
    async searchEventsByLocation(location, options = {}) {
        return this.searchEvents({
            location,
            ...options
        });
    }

    // Get upcoming events for a specific date range
    async getUpcomingEvents(startDate, endDate, options = {}) {
        return this.searchEvents({
            startDate,
            endDate,
            ...options
        });
    }

    async getEventById(eventId) {
        // ... implement getEventById using API or DB ...
        // Example: return null (not implemented)
        return null;
    }

    async healthCheck() {
        // ... implement health check logic ...
        return { status: this.apiKey ? 'healthy' : 'unhealthy', provider: this.getProviderName() };
    }

    getProviderName() {
        return 'eventbrite';
    }

    async isAvailable() {
        return !!this.apiKey;
    }

    async saveEvent(eventData) {
        try {
            const result = await pool.query(`
                INSERT INTO events (
                    external_id, name, artist, venue_name, venue_city, venue_state,
                    event_date, ticket_url, min_price, max_price, created_at, updated_at,
                    event_type, event_subtype, venue_type, special_venue, event_metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (external_id) 
                DO UPDATE SET
                    name = EXCLUDED.name,
                    artist = EXCLUDED.artist,
                    venue_name = EXCLUDED.venue_name,
                    venue_city = EXCLUDED.venue_city,
                    venue_state = EXCLUDED.venue_state,
                    event_date = EXCLUDED.event_date,
                    ticket_url = EXCLUDED.ticket_url,
                    min_price = EXCLUDED.min_price,
                    max_price = EXCLUDED.max_price,
                    updated_at = CURRENT_TIMESTAMP,
                    event_type = EXCLUDED.event_type,
                    event_subtype = EXCLUDED.event_subtype,
                    venue_type = EXCLUDED.venue_type,
                    special_venue = EXCLUDED.special_venue,
                    event_metadata = EXCLUDED.event_metadata
                RETURNING id
            `, [
                eventData.externalId,
                eventData.name,
                eventData.artist,
                eventData.venueName,
                eventData.venueCity,
                eventData.venueState,
                eventData.eventDate,
                eventData.ticketUrl,
                eventData.minPrice,
                eventData.maxPrice,
                eventData.createdAt || new Date().toISOString(),
                eventData.updatedAt || new Date().toISOString(),
                eventData.eventType || 'music',
                eventData.eventSubtype || null,
                eventData.venueType || null,
                eventData.specialVenue || false,
                eventData.eventMetadata ? JSON.stringify(eventData.eventMetadata) : '{}'
            ]);
            return result.rows[0]?.id;
        } catch (error) {
            console.error('❌ Error saving event:', error);
            throw new Error('Failed to save event');
        }
    }
}

module.exports = new EventbriteService(); 