const axios = require('axios');
const { redisClient } = require('../../redisClient');
const winston = require('winston');
const { TravelProviderInterface } = require('../travelProviderInterface');

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

class SeatGeekProvider extends TravelProviderInterface {
    constructor() {
        super();
        this.clientId = process.env.SEATGEEK_CLIENT_ID;
        this.clientSecret = process.env.SEATGEEK_CLIENT_SECRET;
        this.baseUrl = 'https://api.seatgeek.com/2';
        
        if (!this.clientId || !this.clientSecret) {
            logger.warn('⚠️  SEATGEEK_CLIENT_ID or SEATGEEK_CLIENT_SECRET not found in environment variables');
        }
    }

    getProviderName() {
        return 'seatgeek';
    }

    async isAvailable() {
        return !!(this.clientId && this.clientSecret);
    }

    async healthCheck() {
        try {
            if (!this.clientId || !this.clientSecret) {
                return { status: 'unavailable', reason: 'API credentials not configured' };
            }

            // Test with a simple API call
            const response = await this.makeRequest('/events', { per_page: 1 });
            
            return { 
                status: 'healthy', 
                responseTime: response.headers['x-response-time'] || 'unknown',
                dataAvailable: !!(response.data && response.data.events)
            };

        } catch (error) {
            logger.error(`SeatGeek health check failed: ${error.message}`);
            return { 
                status: 'unhealthy', 
                error: error.message 
            };
        }
    }

    // Helper method to make authenticated requests
    async makeRequest(endpoint, params = {}) {
        if (!this.clientId || !this.clientSecret) {
            throw new Error('SeatGeek API credentials not configured');
        }

        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        
        return axios.get(`${this.baseUrl}${endpoint}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            params: {
                ...params,
                client_id: this.clientId
            },
            timeout: 10000
        });
    }

    // Search events (tickets)
    async searchEvents(options = {}) {
        try {
            const {
                query = '',
                venue = '',
                city = '',
                state = '',
                date = '',
                per_page = 20,
                page = 1
            } = options;

            const cacheKey = `seatgeek_events_${query}_${venue}_${city}_${state}_${date}_${per_page}_${page}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached SeatGeek event results for ${query}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching SeatGeek events with query: ${query}`);

            const params = {
                per_page: Math.min(per_page, 100), // SeatGeek max is 100
                page: page,
                sort: 'score.desc'
            };

            // Only include valid, non-empty parameters
            if (query) params.q = query;
            // Only set venue_id if it's a numeric ID
            if (venue && !isNaN(Number(venue))) {
                params.venue_id = Number(venue);
            } else if (venue) {
                // If venue is a name, include it in the query
                params.q = params.q ? `${params.q} ${venue}` : venue;
            }
            if (city) params.city = city;
            if (state) params.state = state;
            if (date && !isNaN(Date.parse(date))) params.datetime_utc = date;

            logger.info('SeatGeek API params:', params);

            const response = await this.makeRequest('/events', params);
            
            if (response.data && response.data.events) {
                const events = this.formatEventResults(response.data.events);
                
                // Cache the results
                await redisClient.set(cacheKey, JSON.stringify(events), { EX: 900 }); // 15 minutes
                
                logger.info(`Found ${events.length} SeatGeek events`);
                return events;
            } else {
                logger.info('No SeatGeek events found');
                return [];
            }

        } catch (error) {
            logger.error(`SeatGeek event search error: ${error.message}`);
            throw new Error(`Failed to search SeatGeek events: ${error.message}`);
        }
    }

    // Get event details by ID
    async getEventById(eventId) {
        try {
            const cacheKey = `seatgeek_event_${eventId}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached SeatGeek event details for ${eventId}`);
                return JSON.parse(cached);
            }

            logger.info(`Getting SeatGeek event details for ${eventId}`);

            const response = await this.makeRequest(`/events/${eventId}`);
            
            if (response.data) {
                const event = this.formatEventResult(response.data);
                
                // Cache the results
                await redisClient.set(cacheKey, JSON.stringify(event), { EX: 1800 }); // 30 minutes
                
                return event;
            } else {
                throw new Error('Event not found');
            }

        } catch (error) {
            logger.error(`SeatGeek get event error: ${error.message}`);
            throw new Error(`Failed to get SeatGeek event: ${error.message}`);
        }
    }

    // Search venues
    async searchVenues(options = {}) {
        try {
            const {
                query = '',
                city = '',
                state = '',
                per_page = 20
            } = options;

            const cacheKey = `seatgeek_venues_${query}_${city}_${state}_${per_page}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached SeatGeek venue results for ${query}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching SeatGeek venues with query: ${query}`);

            const params = {
                per_page: Math.min(per_page, 100),
                sort: 'score.desc'
            };

            if (query) params.q = query;
            if (city) params.city = city;
            if (state) params.state = state;

            const response = await this.makeRequest('/venues', params);
            
            if (response.data && response.data.venues) {
                const venues = this.formatVenueResults(response.data.venues);
                
                // Cache the results
                await redisClient.set(cacheKey, JSON.stringify(venues), { EX: 3600 }); // 1 hour
                
                logger.info(`Found ${venues.length} SeatGeek venues`);
                return venues;
            } else {
                logger.info('No SeatGeek venues found');
                return [];
            }

        } catch (error) {
            logger.error(`SeatGeek venue search error: ${error.message}`);
            throw new Error(`Failed to search SeatGeek venues: ${error.message}`);
        }
    }

    // Search tickets by event ID
    async searchTicketsByEventId(eventId, maxResults = 10) {
        if (!this.clientId) return [];
        try {
            const url = `https://api.seatgeek.com/2/events/${eventId}?client_id=${this.clientId}`;
            const resp = await axios.get(url);
            if (resp.data && resp.data.stats && resp.data.stats.listing_count > 0 && resp.data.performances) {
                // Map ticket details from performances or stats
                return (resp.data.performances || []).map(perf => ({
                    provider: this.getProviderName(),
                    price: perf.price || null,
                    section: perf.section || null,
                    row: perf.row || null,
                    seat: perf.seat || null,
                    delivery: perf.delivery_method || null,
                    url: resp.data.url,
                    details: perf
                })).slice(0, maxResults);
            }
            // If no performances, fallback to stats
            if (resp.data.stats && resp.data.stats.lowest_price) {
                return [{
                    provider: this.getProviderName(),
                    price: resp.data.stats.lowest_price,
                    section: null,
                    row: null,
                    seat: null,
                    delivery: null,
                    url: resp.data.url,
                    details: resp.data.stats
                }];
            }
            return [];
        } catch (err) {
            logger.error(`[SeatGeekProvider] searchTicketsByEventId error:`, err.message);
            return [];
        }
    }

    // Format event results
    formatEventResults(events) {
        return events.map(event => this.formatEventResult(event));
    }

    // Format single event result
    formatEventResult(event) {
        // Extract price robustly
        const price = event.stats?.lowest_price || event.stats?.average_price || null;
        if (!price) {
            logger.warn(`No price found for SeatGeek event:`, event);
        }
        return {
            id: event.id,
            provider: 'seatgeek',
            title: event.title,
            artist: event.performers?.[0]?.name || event.title,
            venue: {
                id: event.venue?.id,
                name: event.venue?.name,
                city: event.venue?.city,
                state: event.venue?.state,
                country: event.venue?.country,
                address: event.venue?.address,
                postal_code: event.venue?.postal_code,
                latitude: event.venue?.location?.lat,
                longitude: event.venue?.location?.lon
            },
            date: event.datetime_utc,
            localDate: event.datetime_local,
            timezone: event.venue?.timezone,
            url: event.url,
            price: price, // Always set top-level price
            stats: {
                lowestPrice: event.stats?.lowest_price,
                highestPrice: event.stats?.highest_price,
                averagePrice: event.stats?.average_price,
                listingCount: event.stats?.listing_count
            },
            performers: event.performers?.map(performer => ({
                id: performer.id,
                name: performer.name,
                url: performer.url,
                image: performer.image
            })) || [],
            images: event.images || [],
            dataSource: 'seatgeek'
        };
    }

    // Format venue results
    formatVenueResults(venues) {
        return venues.map(venue => ({
            id: venue.id,
            provider: 'seatgeek',
            name: venue.name,
            city: venue.city,
            state: venue.state,
            country: venue.country,
            address: venue.address,
            postal_code: venue.postal_code,
            latitude: venue.location?.lat,
            longitude: venue.location?.lon,
            timezone: venue.timezone,
            url: venue.url,
            dataSource: 'seatgeek'
        }));
    }

    // Get pricing information
    getPricingInfo() {
        return {
            provider: 'seatgeek',
            costPerSearch: 0, // SeatGeek has free API tier
            currency: 'USD',
            plans: {
                free: { searches: 1000, cost: 0 },
                paid: { searches: 'unlimited', cost: 'contact_seatgeek' }
            }
        };
    }
}

module.exports = SeatGeekProvider; 