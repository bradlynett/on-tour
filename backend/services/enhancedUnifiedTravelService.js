const AmadeusProvider = require('./providers/amadeusProvider');
const SerpAPIProvider = require('./providers/serpapiProvider');
const SeatGeekProvider = require('./providers/seatgeekProvider');
const AmadeusHotelService = require('./amadeusHotelService');
const AmadeusTransferService = require('./amadeusTransferService');
const { redisClient } = require('../redisClient');
const errorHandler = require('./errorHandler');
const winston = require('winston');
const path = require('path');

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
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
        new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' })
    ]
});

class EnhancedUnifiedTravelService {
    constructor() {
        this.providers = {
            // Flight providers (priority order) - ONLY REAL PROVIDERS
            serpapi: new SerpAPIProvider(),
            amadeus: new AmadeusProvider(),
            
            // Hotel providers (priority order) - ONLY REAL PROVIDERS
            serpapi_hotels: new SerpAPIProvider(), // SerpAPI for hotels
            
            // Ticket providers (priority order) - ONLY REAL PROVIDERS
            seatgeek: new SeatGeekProvider(),
            ticketmaster: null, // Will be injected from existing service
        };
        
        this.providerPriority = {
            flights: ['serpapi', 'amadeus'],
            hotels: ['serpapi_hotels'],
            tickets: ['seatgeek', 'ticketmaster'],
            cars: ['serpapi', 'amadeus']
        };
        
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    // Set ticketmaster provider (injected from existing service)
    setTicketmasterProvider(ticketmasterProvider) {
        this.providers.ticketmaster = ticketmasterProvider;
    }

    // Get available providers
    async getAvailableProviders() {
        const available = {};
        
        for (const [name, provider] of Object.entries(this.providers)) {
            if (!provider) continue;
            
            try {
                const isAvailable = await provider.isAvailable();
                available[name] = {
                    name: provider.getProviderName ? provider.getProviderName() : name,
                    available: isAvailable,
                    health: await provider.healthCheck()
                };
            } catch (error) {
                logger.error(`Error checking provider ${name}: ${error.message}`);
                available[name] = {
                    name: provider.getProviderName ? provider.getProviderName() : name,
                    available: false,
                    error: error.message
                };
            }
        }
        
        return available;
    }

    // Enhanced Flight Search with SerpAPI integration
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10, preferredProvider = null) {
        try {
            const cacheKey = `enhanced_flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}_${preferredProvider || 'all'}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached enhanced flight results for ${origin} to ${destination}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching flights from ${origin} to ${destination} using enhanced providers`);

            const results = {
                flights: [],
                providers: [],
                meta: {
                    origin,
                    destination,
                    departureDate,
                    returnDate,
                    passengers,
                    searchTime: new Date().toISOString()
                }
            };

            // Determine which providers to use
            const providersToSearch = preferredProvider 
                ? [preferredProvider] 
                : this.providerPriority.flights;

            // Search each provider
            for (const providerName of providersToSearch) {
                const provider = this.providers[providerName];
                if (!provider) continue;

                try {
                    const isAvailable = await provider.isAvailable();
                    if (!isAvailable) {
                        logger.warn(`Provider ${providerName} is not available, skipping`);
                        continue;
                    }

                    logger.info(`Searching flights with ${providerName}`);
                    let providerFlights;
                    
                    if (providerName === 'serpapi') {
                        // SerpAPI uses Google Flights
                        providerFlights = await provider.searchFlights(
                            origin, 
                            destination, 
                            departureDate, 
                            returnDate, 
                            passengers, 
                            maxResults
                        );
                    } else {
                        // Standard provider interface
                        providerFlights = await provider.searchFlights(
                            origin, 
                            destination, 
                            departureDate, 
                            returnDate, 
                            passengers, 
                            maxResults
                        );
                    }

                    // Normalize results
                    const flights = Array.isArray(providerFlights) ? providerFlights : 
                                  (providerFlights.flights || providerFlights.results || []);

                    // Add provider info to each flight
                    const flightsWithProvider = flights.map(flight => ({
                        ...flight,
                        searchProvider: providerName
                    }));

                    results.flights.push(...flightsWithProvider);
                    results.providers.push({
                        name: providerName,
                        status: 'success',
                        count: flights.length
                    });

                    logger.info(`Found ${flights.length} flights from ${providerName}`);

                } catch (error) {
                    logger.error(`Error searching flights with ${providerName}: ${error.message}`);
                    results.providers.push({
                        name: providerName,
                        status: 'error',
                        error: error.message
                    });
                }
            }

            // Sort flights by price (lowest first)
            results.flights.sort((a, b) => {
                const priceA = a.price?.total || a.price || 0;
                const priceB = b.price?.total || b.price || 0;
                return priceA - priceB;
            });

            // Limit total results
            results.flights = results.flights.slice(0, maxResults * 2);

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            
            logger.info(`Enhanced search found ${results.flights.length} total flights from ${results.providers.length} providers`);
            return results;

        } catch (error) {
            logger.error(`Enhanced flight search error: ${error.message}`);
            throw new Error(`Failed to search flights: ${error.message}`);
        }
    }

    // Enhanced Hotel Search with SerpAPI integration
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        try {
            const cacheKey = `enhanced_hotel_${cityCode}_${checkInDate}_${checkOutDate}_${adults}`;
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached enhanced hotel results for ${cityCode}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching hotels in ${cityCode} using enhanced providers`);

            let results = {
                hotels: [],
                providers: [],
                meta: {
                    cityCode,
                    checkInDate,
                    checkOutDate,
                    adults,
                    searchTime: new Date().toISOString()
                }
            };

            // Try SerpAPI first
            let serpapiHotels = [];
            try {
                const serpapiProvider = this.providers['serpapi_hotels'];
                if (serpapiProvider && await serpapiProvider.isAvailable()) {
                    logger.info('Searching hotels with SerpAPI');
                    serpapiHotels = await serpapiProvider.searchHotels(
                        cityCode,
                        checkInDate,
                        checkOutDate,
                        adults,
                        radius,
                        maxResults
                    );
                    logger.info(`Found ${serpapiHotels.length} hotels from SerpAPI`);
                }
            } catch (error) {
                logger.error(`Error searching hotels with SerpAPI: ${error.message}`);
            }

            // If SerpAPI returns no hotels, try Amadeus
            let amadeusHotels = [];
            if (!serpapiHotels || serpapiHotels.length === 0) {
                try {
                    logger.info('Searching hotels with Amadeus as fallback');
                    amadeusHotels = await AmadeusHotelService.searchHotels(
                        cityCode,
                        checkInDate,
                        checkOutDate,
                        adults,
                        radius,
                        maxResults
                    );
                    logger.info(`Found ${amadeusHotels.length} hotels from Amadeus`);
                } catch (error) {
                    logger.error(`Error searching hotels with Amadeus: ${error.message}`);
                }
            }

            // Merge and normalize results
            const allHotels = [...(serpapiHotels || []), ...(amadeusHotels || [])];
            const hotelsWithProvider = allHotels.map(hotel => {
                const price = hotel.price || (hotel.offers && hotel.offers[0]?.price?.total) || null;
                if (!price) {
                    logger.warn(`No price found for hotel:`, hotel);
                }
                return {
                    ...hotel,
                    price: price,
                    rating: hotel.rating || null,
                    bookingUrl: hotel.bookingUrl || (hotel.offers && hotel.offers[0]?.urls?.[0]) || null
                };
            });

            results.hotels = hotelsWithProvider;
            results.providers = [
                { name: 'serpapi_hotels', status: serpapiHotels.length > 0 ? 'success' : 'empty', count: serpapiHotels.length },
                { name: 'amadeus', status: amadeusHotels.length > 0 ? 'success' : 'empty', count: amadeusHotels.length }
            ];

            // Sort hotels by price (lowest first)
            results.hotels.sort((a, b) => {
                const priceA = a.price || 0;
                const priceB = b.price || 0;
                return priceA - priceB;
            });

            // Limit total results
            results.hotels = results.hotels.slice(0, maxResults * 2);

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes

            logger.info(`Enhanced hotel search found ${results.hotels.length} total hotels from ${results.providers.length} providers`);
            return results;

        } catch (error) {
            logger.error(`Enhanced hotel search error: ${error.message}`);
            throw new Error(`Failed to search hotels: ${error.message}`);
        }
    }

    // Enhanced Ticket Search with SeatGeek integration
    async searchTickets(eventName, venueName, eventDate, maxResults = 10, preferredProvider = null) {
        try {
            const cacheKey = `enhanced_ticket_${eventName}_${venueName}_${eventDate}_${preferredProvider || 'all'}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached enhanced ticket results for ${eventName}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching tickets for ${eventName} using enhanced providers`);

            const results = {
                tickets: [],
                providers: [],
                meta: {
                    eventName,
                    venueName,
                    eventDate,
                    searchTime: new Date().toISOString()
                }
            };

            // Determine which providers to use
            const providersToSearch = preferredProvider 
                ? [preferredProvider] 
                : this.providerPriority.tickets;

            // Search each provider
            for (const providerName of providersToSearch) {
                const provider = this.providers[providerName];
                if (!provider) continue;

                try {
                    const isAvailable = await provider.isAvailable();
                    if (!isAvailable) {
                        logger.warn(`Provider ${providerName} is not available, skipping`);
                        continue;
                    }

                    logger.info(`Searching tickets with ${providerName}`);
                    let providerTickets;
                    
                    if (providerName === 'seatgeek') {
                        // SeatGeek specific search
                        providerTickets = await provider.searchEvents({
                            query: eventName,
                            venue: venueName,
                            datetime_utc: eventDate,
                            per_page: maxResults
                        });
                        
                        // Convert SeatGeek events to ticket format
                        providerTickets = providerTickets.map(event => ({
                            provider: 'seatgeek',
                            price: event.stats?.lowest_price || null,
                            maxPrice: event.stats?.highest_price || null,
                            currency: 'USD',
                            url: event.url,
                            section: null,
                            row: null,
                            seat: null,
                            delivery: 'Mobile Entry',
                            details: event.title,
                            eventId: event.id,
                            venue: event.venue,
                            datetime: event.datetime_utc
                        }));
                    } else {
                        // Standard provider interface
                        providerTickets = await provider.searchTickets(
                            eventName,
                            venueName,
                            eventDate,
                            maxResults
                        );
                    }

                    // Normalize results
                    const tickets = Array.isArray(providerTickets) ? providerTickets : 
                                  (providerTickets.tickets || providerTickets.results || []);

                    // Add provider info to each ticket
                    const ticketsWithProvider = tickets.map(ticket => ({
                        ...ticket,
                        searchProvider: providerName
                    }));

                    results.tickets.push(...ticketsWithProvider);
                    results.providers.push({
                        name: providerName,
                        status: 'success',
                        count: tickets.length
                    });

                    logger.info(`Found ${tickets.length} tickets from ${providerName}`);

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
            results.tickets.sort((a, b) => {
                const priceA = a.price || 0;
                const priceB = b.price || 0;
                return priceA - priceB;
            });

            // Limit total results
            results.tickets = results.tickets.slice(0, maxResults * 2);

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes

            logger.info(`Enhanced ticket search found ${results.tickets.length} total tickets from ${results.providers.length} providers`);
            return results;

        } catch (error) {
            logger.error(`Enhanced ticket search error: ${error.message}`);
            throw new Error(`Failed to search tickets: ${error.message}`);
        }
    }

    // Enhanced Car Rental Search: Try SerpAPI first, then Amadeus
    async searchRentalCars(cityOrCode, pickUpDate, dropOffDate, adults = 1, maxResults = 10) {
        try {
            const cacheKey = `enhanced_car_${cityOrCode}_${pickUpDate}_${dropOffDate}_${adults}`;
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached enhanced car rental results for ${cityOrCode}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching car rentals in ${cityOrCode} using enhanced providers`);
            const results = {
                cars: [],
                providers: [],
                meta: {
                    cityOrCode,
                    pickUpDate,
                    dropOffDate,
                    adults,
                    searchTime: new Date().toISOString()
                }
            };

            // Search each provider in priority order
            for (const providerName of this.providerPriority.cars) {
                const provider = this.providers[providerName];
                if (!provider) continue;

                try {
                    const isAvailable = await provider.isAvailable();
                    if (!isAvailable) {
                        logger.warn(`Provider ${providerName} is not available, skipping`);
                        continue;
                    }

                    logger.info(`Searching car rentals with ${providerName}`);
                    let cars;
                    if (providerName === 'serpapi') {
                        // SerpAPI car rental search (if implemented)
                        if (typeof provider.searchCarRentals === 'function') {
                            cars = await provider.searchCarRentals(
                                cityOrCode,
                                cityOrCode,
                                pickUpDate,
                                dropOffDate,
                                maxResults
                            );
                        } else {
                            logger.warn('SerpAPI car rental search not implemented, skipping');
                            continue;
                        }
                    } else {
                        // Standard provider interface
                        cars = await provider.searchCarRentals(
                            cityOrCode,
                            cityOrCode,
                            pickUpDate,
                            dropOffDate,
                            maxResults
                        );
                    }

                    // Normalize results
                    const carArray = Array.isArray(cars) ? cars : (cars.cars || cars.results || []);
                    // Add provider info to each car
                    const carsWithProvider = carArray.map(car => ({
                        ...car,
                        searchProvider: providerName
                    }));
                    results.cars.push(...carsWithProvider);
                    results.providers.push({
                        name: providerName,
                        status: 'success',
                        count: carArray.length
                    });
                    logger.info(`Found ${carArray.length} cars from ${providerName}`);
                    // If we found cars, stop searching further providers
                    if (carArray.length > 0) break;
                } catch (error) {
                    logger.error(`Error searching cars with ${providerName}: ${error.message}`);
                    results.providers.push({
                        name: providerName,
                        status: 'error',
                        error: error.message
                    });
                }
            }

            // Sort cars by price (lowest first)
            results.cars.sort((a, b) => {
                const priceA = a.price?.total || a.price || 0;
                const priceB = b.price?.total || b.price || 0;
                return priceA - priceB;
            });

            // Limit total results
            results.cars = results.cars.slice(0, maxResults * 2);

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes

            logger.info(`Enhanced car rental search found ${results.cars.length} total cars from ${results.providers.length} providers`);
            return results;

        } catch (error) {
            logger.error(`Enhanced car rental search error: ${error.message}`);
            throw new Error(`Failed to search car rentals: ${error.message}`);
        }
    }

    // Enhanced Transfer Search using Amadeus
    async searchTransfers(originLocationCode, destinationLocationCode, pickUpDate, pickUpTime, passengers = 1, maxResults = 10) {
        try {
            const cacheKey = `enhanced_transfer_${originLocationCode}_${destinationLocationCode}_${pickUpDate}_${pickUpTime}_${passengers}`;
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached enhanced transfer results for ${originLocationCode} to ${destinationLocationCode}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching transfers from ${originLocationCode} to ${destinationLocationCode} using Amadeus`);
            const transfers = await AmadeusTransferService.searchTransfers(
                originLocationCode,
                destinationLocationCode,
                pickUpDate,
                pickUpTime,
                passengers,
                maxResults
            );
            logger.info(`Enhanced transfer search found ${transfers.length} transfers`);
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(transfers), { EX: 900 }); // 15 minutes
            return transfers;
        } catch (error) {
            logger.error(`Enhanced transfer search error: ${error.message}`);
            throw new Error(`Failed to search transfers: ${error.message}`);
        }
    }

    // Health check for all providers
    async healthCheck() {
        const health = {
            status: 'healthy',
            providers: {},
            timestamp: new Date().toISOString()
        };

        let healthyProviders = 0;
        let totalProviders = 0;

        for (const [name, provider] of Object.entries(this.providers)) {
            if (!provider) continue;
            
            totalProviders++;
            try {
                const isAvailable = await provider.isAvailable();
                const providerHealth = await provider.healthCheck();
                
                health.providers[name] = {
                    available: isAvailable,
                    health: providerHealth
                };

                if (isAvailable) healthyProviders++;
            } catch (error) {
                health.providers[name] = {
                    available: false,
                    error: error.message
                };
            }
        }

        // Overall health based on provider availability
        if (healthyProviders === 0) {
            health.status = 'unhealthy';
        } else if (healthyProviders < totalProviders * 0.5) {
            health.status = 'degraded';
        }

        health.summary = {
            total: totalProviders,
            healthy: healthyProviders,
            unhealthy: totalProviders - healthyProviders
        };

        return health;
    }

    // Clear cache for specific type
    async clearCache(type, params) {
        try {
            const pattern = `enhanced_${type}_*`;
            const keys = await redisClient.keys(pattern);
            
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cleared ${keys.length} cache keys for ${type}`);
            }
            
            return { success: true, clearedKeys: keys.length };
        } catch (error) {
            logger.error(`Error clearing cache: ${error.message}`);
            throw error;
        }
    }

    // Get provider statistics
    async getProviderStats() {
        const stats = {
            providers: {},
            summary: {
                total: 0,
                available: 0,
                unavailable: 0
            }
        };

        for (const [name, provider] of Object.entries(this.providers)) {
            if (!provider) continue;
            
            stats.summary.total++;
            
            try {
                const isAvailable = await provider.isAvailable();
                const health = await provider.healthCheck();
                
                stats.providers[name] = {
                    available: isAvailable,
                    health: health,
                    name: provider.getProviderName ? provider.getProviderName() : name
                };

                if (isAvailable) {
                    stats.summary.available++;
                } else {
                    stats.summary.unavailable++;
                }
            } catch (error) {
                stats.providers[name] = {
                    available: false,
                    error: error.message,
                    name: provider.getProviderName ? provider.getProviderName() : name
                };
                stats.summary.unavailable++;
            }
        }

        return stats;
    }
}

module.exports = new EnhancedUnifiedTravelService(); 