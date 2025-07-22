const TicketmasterProvider = require('./providers/ticketmasterProvider');
const EventbriteProvider = require('./providers/eventbriteProvider');
const StubHubProvider = require('./providers/stubhubProvider');
const VividSeatsProvider = require('./providers/vividSeatsProvider');
const AXSProvider = require('./providers/axsProvider');
const SeatGeekProvider = require('./providers/seatgeekProvider');
const { redisClient } = require('../redisClient');
const path = require('path');
const { logger } = require('../utils/logger');
const { Pool } = require('pg'); // Added for DB interaction
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

class UnifiedTicketingService {
    constructor() {
        this.providers = {
            ticketmaster: new TicketmasterProvider(),
            eventbrite: new EventbriteProvider(),
            stubhub: new StubHubProvider(),
            vividseats: new VividSeatsProvider(),
            axs: new AXSProvider(),
            seatgeek: new SeatGeekProvider() // Use the real SeatGeek provider
        };
        
        this.providerPriority = ['ticketmaster', 'eventbrite', 'stubhub', 'vividseats', 'axs'];
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Search tickets across all available providers
     */
    async searchTickets(eventId, eventName = null, venueName = null, eventDate = null, maxResults = 10, preferredProvider = null) {
        try {
            // Fetch event from DB to get external IDs
            const eventRes = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
            const event = eventRes.rows[0];
            if (!event) throw new Error('Event not found');

            // Try SeatGeek by event ID
            let seatgeekTickets = [];
            if (event.seatgeek_event_id) {
                seatgeekTickets = await this.providers['seatgeek'].searchTicketsByEventId(event.seatgeek_event_id, maxResults);
                console.log('[UnifiedTicketingService] SeatGeek API response:', JSON.stringify(seatgeekTickets, null, 2));
            }
            if (seatgeekTickets && seatgeekTickets.length > 0) {
                return {
                    tickets: seatgeekTickets,
                    providers: [{ name: 'seatgeek', status: 'success', count: seatgeekTickets.length }],
                    meta: { eventId, eventName: event.name, venueName: event.venue_name, eventDate: event.event_date, searchTime: new Date().toISOString(), totalResults: seatgeekTickets.length }
                };
            }

            // Fallback to Ticketmaster by event ID
            let ticketmasterTickets = [];
            if (event.ticketmaster_event_id) {
                ticketmasterTickets = await this.providers['ticketmaster'].searchTicketsByEventId(event.ticketmaster_event_id, maxResults);
            }
            if (ticketmasterTickets && ticketmasterTickets.length > 0) {
                return {
                    tickets: ticketmasterTickets,
                    providers: [{ name: 'ticketmaster', status: 'success', count: ticketmasterTickets.length }],
                    meta: { eventId, eventName: event.name, venueName: event.venue_name, eventDate: event.event_date, searchTime: new Date().toISOString(), totalResults: ticketmasterTickets.length }
                };
            }

            // If neither found, fallback to original logic (search by name, etc.)
            const cacheKey = `unified_tickets_${eventId}_${eventDate || 'any'}_${maxResults}_${preferredProvider || 'all'}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached unified ticket results for event ${eventId}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching tickets for event ${eventId} using multiple providers`);

            const results = {
                tickets: [],
                providers: [],
                meta: {
                    eventId,
                    eventName,
                    venueName,
                    eventDate,
                    searchTime: new Date().toISOString(),
                    totalResults: 0
                }
            };

            // Determine which providers to use
            const providersToSearch = preferredProvider 
                ? [preferredProvider] 
                : this.providerPriority;

            // Search each provider
            for (const providerName of providersToSearch) {
                const provider = this.providers[providerName];
                if (!provider) continue;

                try {
                    const isAvailable = await provider.isAvailable();
                    if (!isAvailable) {
                        logger.warn(`Provider ${providerName} is not available, skipping`);
                        results.providers.push({
                            name: providerName,
                            status: 'unavailable',
                            reason: 'Missing API credentials'
                        });
                        continue;
                    }

                    logger.info(`Searching tickets with ${providerName}`);
                    const providerTickets = await provider.searchTickets(
                        eventId, 
                        eventName, 
                        venueName, 
                        eventDate, 
                        maxResults
                    );

                    // Add provider info to each ticket
                    const ticketsWithProvider = providerTickets.map(ticket => ({
                        ...ticket,
                        searchProvider: providerName
                    }));

                    results.tickets.push(...ticketsWithProvider);
                    results.providers.push({
                        name: providerName,
                        status: 'success',
                        count: providerTickets.length
                    });

                    logger.info(`Found ${providerTickets.length} tickets from ${providerName}`);

                } catch (error) {
                    logger.error(`Error searching tickets with ${providerName}: ${error.message}`);
                    results.providers.push({
                        name: providerName,
                        status: 'error',
                        error: error.message
                    });
                }
            }

            // Sort tickets by price (lowest first)
            results.tickets.sort((a, b) => (a.price || 0) - (b.price || 0));
            results.meta.totalResults = results.tickets.length;

            // Cache results
            if (results.tickets.length > 0) {
                await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            }

            logger.info(`Found ${results.tickets.length} total tickets from ${results.providers.filter(p => p.status === 'success').length} providers`);
            return results;

        } catch (error) {
            logger.error(`Unified ticket search failed: ${error.message}`);
            return {
                tickets: [],
                providers: [],
                meta: {
                    eventId,
                    eventName,
                    venueName,
                    eventDate,
                    searchTime: new Date().toISOString(),
                    totalResults: 0,
                    error: error.message
                }
            };
        }
    }

    /**
     * Get provider health status
     */
    async getProviderHealth() {
        const healthStatus = {};

        for (const [providerName, provider] of Object.entries(this.providers)) {
            try {
                healthStatus[providerName] = await provider.healthCheck();
            } catch (error) {
                healthStatus[providerName] = {
                    status: 'error',
                    error: error.message
                };
            }
        }

        return healthStatus;
    }

    /**
     * Get available providers
     */
    async getAvailableProviders() {
        const available = [];

        for (const [providerName, provider] of Object.entries(this.providers)) {
            try {
                const isAvailable = await provider.isAvailable();
                if (isAvailable) {
                    available.push(providerName);
                }
            } catch (error) {
                logger.warn(`Error checking availability for ${providerName}: ${error.message}`);
            }
        }

        return available;
    }

    /**
     * Get ticket details from specific provider
     */
    async getTicketDetails(providerName, ticketId) {
        try {
            const provider = this.providers[providerName];
            if (!provider) {
                throw new Error(`Provider ${providerName} not found`);
            }

            if (!await provider.isAvailable()) {
                throw new Error(`Provider ${providerName} is not available`);
            }

            // This would need to be implemented in each provider
            // For now, return a placeholder
            return {
                provider: providerName,
                ticketId,
                status: 'available',
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`Error getting ticket details from ${providerName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Compare ticket prices across providers
     */
    async compareTicketPrices(eventId, eventName = null, venueName = null, eventDate = null) {
        try {
            const results = await this.searchTickets(eventId, eventName, venueName, eventDate, 50);
            
            const comparison = {
                eventId,
                eventName,
                venueName,
                eventDate,
                comparisonTime: new Date().toISOString(),
                priceRanges: {},
                providerStats: {}
            };

            // Group tickets by provider
            const ticketsByProvider = {};
            results.tickets.forEach(ticket => {
                const provider = ticket.searchProvider;
                if (!ticketsByProvider[provider]) {
                    ticketsByProvider[provider] = [];
                }
                ticketsByProvider[provider].push(ticket);
            });

            // Calculate price ranges for each provider
            for (const [provider, tickets] of Object.entries(ticketsByProvider)) {
                const prices = tickets.map(t => t.price).filter(p => p > 0).sort((a, b) => a - b);
                
                if (prices.length > 0) {
                    comparison.priceRanges[provider] = {
                        min: prices[0],
                        max: prices[prices.length - 1],
                        average: prices.reduce((a, b) => a + b, 0) / prices.length,
                        median: prices[Math.floor(prices.length / 2)],
                        count: prices.length
                    };
                }

                comparison.providerStats[provider] = {
                    totalTickets: tickets.length,
                    availableSections: [...new Set(tickets.map(t => t.section).filter(Boolean))],
                    deliveryMethods: [...new Set(tickets.map(t => t.deliveryMethod).filter(Boolean))]
                };
            }

            return comparison;

        } catch (error) {
            logger.error(`Ticket price comparison failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get trending events across all providers
     */
    async getTrendingEvents(limit = 20) {
        try {
            const cacheKey = `trending_events_${limit}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const trendingEvents = [];
            const eventCounts = {};

            // Get events from each provider
            for (const [providerName, provider] of Object.entries(this.providers)) {
                try {
                    if (!await provider.isAvailable()) continue;

                    // This would need to be implemented in each provider
                    // For now, we'll use a placeholder
                    logger.info(`Getting trending events from ${providerName}`);
                    
                } catch (error) {
                    logger.warn(`Error getting trending events from ${providerName}: ${error.message}`);
                }
            }

            // Cache results
            if (trendingEvents.length > 0) {
                await redisClient.set(cacheKey, JSON.stringify(trendingEvents), { EX: 1800 }); // 30 minutes
            }

            return trendingEvents;

        } catch (error) {
            logger.error(`Getting trending events failed: ${error.message}`);
            return [];
        }
    }
}

module.exports = UnifiedTicketingService; 