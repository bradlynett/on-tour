const axios = require('axios');
const { pool } = require('../config/database');
const EventProviderInterface = require('./eventProviderInterface');

class EventService extends EventProviderInterface {
    constructor() {
        super();
        this.apiKey = process.env.TICKETMASTER_API_KEY;
        this.baseUrl = 'https://app.ticketmaster.com/discovery/v2';
        
        if (!this.apiKey) {
            console.warn('⚠️  TICKETMASTER_API_KEY not found in environment variables');
        }
    }

    async searchEvents(options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('Ticketmaster API key not configured');
            }

            const {
                keyword = '',
                city = '',
                state = '',
                country = 'US',
                startDateTime = '',
                endDateTime = '',
                size = 20,
                page = 0,
                classificationName = 'music',
                sort = 'date,asc'
            } = options;

            const params = {
                apikey: this.apiKey,
                size: Math.min(size, 200), // Ticketmaster max is 200
                page: page,
                classificationName: classificationName,
                sort: sort
            };

            // Add optional filters
            if (keyword) params.keyword = keyword;
            if (city) params.city = city;
            if (state) params.stateCode = state;
            if (country) params.countryCode = country;
            if (startDateTime) params.startDateTime = this.formatDateForAPI(startDateTime);
            if (endDateTime) params.endDateTime = this.formatDateForAPI(endDateTime);

            // Add event_type and event_subtype filters
            if (options.eventType) params.eventType = options.eventType;
            if (options.eventSubtype) params.eventSubtype = options.eventSubtype;

            console.log('🔍 Searching Ticketmaster API with params:', params);

            const response = await axios.get(`${this.baseUrl}/events.json`, { params });
            
            if (response.data._embedded && response.data._embedded.events) {
                const events = response.data._embedded.events.map(event => this.formatEvent(event));
                return {
                    events,
                    page: response.data.page,
                    totalElements: response.data.page.totalElements,
                    totalPages: response.data.page.totalPages
                };
            } else {
                return {
                    events: [],
                    page: { number: page, totalElements: 0, totalPages: 0 },
                    totalElements: 0,
                    totalPages: 0
                };
            }
        } catch (error) {
            console.error('❌ Error searching events:', error.response?.data || error.message);
            throw new Error('Failed to search events');
        }
    }

    async getEventById(eventId) {
        try {
            if (!this.apiKey) {
                throw new Error('Ticketmaster API key not configured');
            }

            const response = await axios.get(`${this.baseUrl}/events/${eventId}`, {
                params: { apikey: this.apiKey }
            });

            return this.formatEvent(response.data);
        } catch (error) {
            console.error('❌ Error getting event details:', error.response?.data || error.message);
            throw new Error('Failed to get event details');
        }
    }

    // Search events by artist
    async searchEventsByArtist(artistName, options = {}) {
        return this.searchEvents({
            keyword: artistName,
            classificationName: 'music',
            ...options
        });
    }

    // Search events by venue
    async searchEventsByVenue(venueName, options = {}) {
        return this.searchEvents({
            keyword: venueName,
            classificationName: 'music',
            ...options
        });
    }

    // Search events by city
    async searchEventsByCity(city, state = '', options = {}) {
        return this.searchEvents({
            city,
            state,
            classificationName: 'music',
            ...options
        });
    }

    // Format dates to Ticketmaster's expected format: YYYY-MM-DDTHH:mm:ssZ
    formatDateForAPI(date) {
        if (typeof date === 'string') {
            return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
        }
        return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    // Get upcoming events for a specific date range
    async getUpcomingEvents(startDate, endDate, options = {}) {
        return this.searchEvents({
            startDateTime: this.formatDateForAPI(startDate),
            endDateTime: this.formatDateForAPI(endDate),
            classificationName: 'music',
            sort: 'date,asc',
            ...options
        });
    }

    // Format Ticketmaster event data to our schema
    formatEvent(ticketmasterEvent) {
        const rawEventType = (ticketmasterEvent.classifications && ticketmasterEvent.classifications[0]?.segment?.name?.toLowerCase()) || 'music';
        // Map Ticketmaster classifications to our allowed event types
        const eventTypeMapping = {
            'music': 'music',
            'sports': 'sports',
            'comedy': 'comedy',
            'arts': 'theater', // Map 'arts' to 'theater'
            'family': 'family',
            'miscellaneous': 'other'
        };
        const eventType = eventTypeMapping[rawEventType] || 'other';
        const eventSubtype = (ticketmasterEvent.classifications && ticketmasterEvent.classifications[0]?.genre?.name) || null;
        const venueType = (ticketmasterEvent._embedded?.venues?.[0]?.type) || null;
        const specialVenue = false; // Could add logic for special venues
        const eventMetadata = {
            originalClassifications: ticketmasterEvent.classifications,
            promoter: ticketmasterEvent.promoter,
            info: ticketmasterEvent.info,
            pleaseNote: ticketmasterEvent.pleaseNote
        };
        const event = {
            externalId: ticketmasterEvent.id,
            name: ticketmasterEvent.name,
            artist: this.extractArtist(ticketmasterEvent),
            venueName: ticketmasterEvent._embedded?.venues?.[0]?.name || '',
            venueCity: ticketmasterEvent._embedded?.venues?.[0]?.city?.name || '',
            venueState: ticketmasterEvent._embedded?.venues?.[0]?.state?.stateCode || '',
            venueAddress: ticketmasterEvent._embedded?.venues?.[0]?.address?.line1 || '',
            venuePostalCode: ticketmasterEvent._embedded?.venues?.[0]?.postalCode || '',
            eventDate: ticketmasterEvent.dates?.start?.dateTime || ticketmasterEvent.dates?.start?.localDate,
            ticketUrl: ticketmasterEvent.url,
            minPrice: this.extractMinPrice(ticketmasterEvent),
            maxPrice: this.extractMaxPrice(ticketmasterEvent),
            currency: ticketmasterEvent.priceRanges?.[0]?.currency || 'USD',
            status: ticketmasterEvent.dates?.status?.code || 'unknown',
            images: ticketmasterEvent.images?.map(img => ({
                url: img.url,
                width: img.width,
                height: img.height
            })) || [],
            classifications: ticketmasterEvent.classifications || [],
            promoter: ticketmasterEvent.promoter?.name || '',
            info: ticketmasterEvent.info || '',
            pleaseNote: ticketmasterEvent.pleaseNote || '',
            priceRanges: ticketmasterEvent.priceRanges || [],
            seatmap: ticketmasterEvent.seatmap?.staticUrl || '',
            accessibility: ticketmasterEvent.accessibility || {},
            ticketLimit: ticketmasterEvent.ticketLimit?.info || '',
            createdAt: new Date().toISOString(),
            eventType,
            eventSubtype,
            venueType,
            specialVenue,
            eventMetadata
        };
        return event;
    }

    // Extract artist name from event
    extractArtist(event) {
        // Try to get artist from attractions
        if (event._embedded?.attractions) {
            const artist = event._embedded.attractions.find(attraction => 
                attraction.classifications?.some(classification => 
                    classification.segment?.name === 'Music'
                )
            );
            if (artist) return artist.name;
        }

        // Fallback to event name if it looks like an artist name
        if (event.name && !event.name.includes('at') && !event.name.includes('in')) {
            return event.name;
        }

        return '';
    }

    // Extract minimum price
    extractMinPrice(event) {
        if (event.priceRanges && event.priceRanges.length > 0) {
            return event.priceRanges[0].min;
        }
        return null;
    }

    // Extract maximum price
    extractMaxPrice(event) {
        if (event.priceRanges && event.priceRanges.length > 0) {
            return event.priceRanges[0].max;
        }
        return null;
    }

    async healthCheck() {
        return { status: this.apiKey ? 'healthy' : 'unhealthy', provider: this.getProviderName() };
    }

    getProviderName() {
        return 'ticketmaster';
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
            const eventId = result.rows[0].id;

            // Enrich with external IDs if missing
            const eventRes = await pool.query('SELECT id, name, artist, event_date, venue_name, venue_city, venue_state, seatgeek_event_id, ticketmaster_event_id FROM events WHERE id = $1', [eventId]);
            const event = eventRes.rows[0];
            let seatgeekId = event.seatgeek_event_id;
            let ticketmasterId = event.ticketmaster_event_id;
            const axios = require('axios');
            const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;
            const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
            // SeatGeek enrichment
            try {
                if (!seatgeekId && SEATGEEK_CLIENT_ID) {
                    const q = encodeURIComponent(`${event.artist || ''} ${event.name} ${event.venue_name || ''}`.trim());
                    const date = event.event_date.toISOString().split('T')[0];
                    const url = `https://api.seatgeek.com/2/events?q=${q}&datetime_utc=${date}&venue.city=${encodeURIComponent(event.venue_city || '')}&venue.state=${encodeURIComponent(event.venue_state || '')}&client_id=${SEATGEEK_CLIENT_ID}`;
                    const resp = await axios.get(url);
                    if (resp.data.events && resp.data.events.length > 0) {
                        // Strict match: date and venue
                        let match = resp.data.events.find(e => {
                            const eventDate = e.datetime_utc ? e.datetime_utc.split('T')[0] : '';
                            return eventDate === date && e.venue && e.venue.name && e.venue.name.toLowerCase().includes((event.venue_name || '').toLowerCase());
                        });
                        // Fallback: match by date only
                        if (!match) {
                            match = resp.data.events.find(e => {
                                const eventDate = e.datetime_utc ? e.datetime_utc.split('T')[0] : '';
                                return eventDate === date;
                            });
                        }
                        // Fallback: match by artist and city
                        if (!match) {
                            match = resp.data.events.find(e => {
                                return e.performers && e.performers.some(p => p.name && event.artist && p.name.toLowerCase().includes(event.artist.toLowerCase())) &&
                                    e.venue && e.venue.city && event.venue_city && e.venue.city.toLowerCase() === event.venue_city.toLowerCase();
                            });
                        }
                        // Fallback: just take the first event
                        if (!match) {
                            match = resp.data.events[0];
                        }
                        if (match && match.id) {
                            seatgeekId = match.id;
                            console.log(`[Enrichment] SeatGeek match for event ${event.id}: ${seatgeekId}`);
                        } else {
                            console.warn(`[Enrichment] No SeatGeek match for event ${event.id}`);
                        }
                    } else {
                        console.warn(`[Enrichment] No SeatGeek events found for event ${event.id}`);
                    }
                }
            } catch (err) {
                console.warn(`SeatGeek enrichment failed for event ${event.id}: ${err.message}`);
            }
            // Ticketmaster enrichment
            try {
                if (!ticketmasterId && TICKETMASTER_API_KEY) {
                    const keyword = encodeURIComponent(`${event.artist || ''} ${event.name}`.trim());
                    const date = event.event_date.toISOString().split('T')[0];
                    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&keyword=${keyword}&venue=${encodeURIComponent(event.venue_name || '')}&city=${encodeURIComponent(event.venue_city || '')}&stateCode=${encodeURIComponent(event.venue_state || '')}&startDateTime=${date}T00:00:00Z&endDateTime=${date}T23:59:59Z`;
                    const resp = await axios.get(url);
                    if (resp.data._embedded && resp.data._embedded.events && resp.data._embedded.events.length > 0) {
                        // Strict match: date and venue
                        let match = resp.data._embedded.events.find(e => {
                            const eventDate = e.dates && e.dates.start && e.dates.start.localDate;
                            return eventDate === date && e._embedded && e._embedded.venues && e._embedded.venues[0].name && e._embedded.venues[0].name.toLowerCase().includes((event.venue_name || '').toLowerCase());
                        });
                        // Fallback: match by date only
                        if (!match) {
                            match = resp.data._embedded.events.find(e => {
                                const eventDate = e.dates && e.dates.start && e.dates.start.localDate;
                                return eventDate === date;
                            });
                        }
                        // Fallback: match by artist and city
                        if (!match) {
                            match = resp.data._embedded.events.find(e => {
                                return e._embedded && e._embedded.venues && e._embedded.venues[0].city && event.venue_city && e._embedded.venues[0].city.name.toLowerCase() === event.venue_city.toLowerCase() &&
                                    e.name && event.artist && e.name.toLowerCase().includes(event.artist.toLowerCase());
                            });
                        }
                        // Fallback: just take the first event
                        if (!match) {
                            match = resp.data._embedded.events[0];
                        }
                        if (match && match.id) {
                            ticketmasterId = match.id;
                            console.log(`[Enrichment] Ticketmaster match for event ${event.id}: ${ticketmasterId}`);
                        } else {
                            console.warn(`[Enrichment] No Ticketmaster match for event ${event.id}`);
                        }
                    } else {
                        console.warn(`[Enrichment] No Ticketmaster events found for event ${event.id}`);
                    }
                }
            } catch (err) {
                console.warn(`Ticketmaster enrichment failed for event ${event.id}: ${err.message}`);
            }
            // Only update if we found a valid ID
            if (seatgeekId || ticketmasterId) {
                await pool.query('UPDATE events SET seatgeek_event_id = COALESCE($1, seatgeek_event_id), ticketmaster_event_id = COALESCE($2, ticketmaster_event_id) WHERE id = $3', [seatgeekId, ticketmasterId, event.id]);
            }
            return eventId;
        } catch (error) {
            console.error('❌ Error saving event:', error);
            throw new Error('Failed to save event');
        }
    }

    // Save multiple events to database
    async saveEvents(events) {
        const savedIds = [];
        for (const event of events) {
            try {
                const id = await this.saveEvent(event);
                savedIds.push(id);
            } catch (error) {
                console.error(`❌ Error saving event ${event.externalId}:`, error);
            }
        }
        return savedIds;
    }

    // Get events from database
    async getEvents(options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                artist = '',
                venue = '',
                city = '',
                startDate = '',
                endDate = ''
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

            query += ` ORDER BY event_date ASC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting events:', error);
            throw new Error('Failed to get events');
        }
    }
}

module.exports = new EventService(); 