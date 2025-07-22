const AmadeusProvider = require('./providers/amadeusProvider');
const MockSkyscannerProvider = require('./providers/mockSkyscannerProvider');
const BookingComProvider = require('./providers/bookingComProvider');
const AgodaProvider = require('./providers/agodaProvider');
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

class UnifiedTravelService {
    constructor() {
        this.providers = {
            amadeus: new AmadeusProvider(),
            skyscanner: new MockSkyscannerProvider(), // Using mock for now
            bookingcom: new BookingComProvider(),
            agoda: new AgodaProvider()
        };
        
        this.providerPriority = ['amadeus', 'bookingcom', 'agoda', 'skyscanner']; // Priority order for fallbacks
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    // Get available providers
    async getAvailableProviders() {
        const available = {};
        
        for (const [name, provider] of Object.entries(this.providers)) {
            try {
                const isAvailable = await provider.isAvailable();
                available[name] = {
                    name: provider.getProviderName(),
                    available: isAvailable,
                    health: await provider.healthCheck()
                };
            } catch (error) {
                logger.error(`Error checking provider ${name}: ${error.message}`);
                available[name] = {
                    name: provider.getProviderName(),
                    available: false,
                    error: error.message
                };
            }
        }
        
        return available;
    }

    // Flight Search with provider fallback
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10, preferredProvider = null) {
        try {
            const cacheKey = `unified_flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}_${preferredProvider || 'all'}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached unified flight results for ${origin} to ${destination}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching flights from ${origin} to ${destination} using multiple providers`);

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
                : this.providerPriority;

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
                    const providerFlights = await provider.searchFlights(
                        origin, 
                        destination, 
                        departureDate, 
                        returnDate, 
                        passengers, 
                        maxResults
                    );

                    // Add provider info to each flight
                    const flightsWithProvider = providerFlights.flights.map(flight => ({
                        ...flight,
                        searchProvider: providerName
                    }));

                    results.flights.push(...flightsWithProvider);
                    results.providers.push({
                        name: providerName,
                        status: 'success',
                        count: providerFlights.flights.length
                    });

                    logger.info(`Found ${providerFlights.flights.length} flights from ${providerName}`);

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
            results.flights.sort((a, b) => a.price.total - b.price.total);

            // Limit total results
            results.flights = results.flights.slice(0, maxResults * 2); // Allow more results since we're combining providers

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            
            logger.info(`Unified search found ${results.flights.length} total flights from ${results.providers.length} providers`);
            return results;

        } catch (error) {
            logger.error(`Unified flight search error: ${error.message}`);
            throw new Error(`Failed to search flights: ${error.message}`);
        }
    }

    // Hotel Search (aggregate Amadeus, Booking.com, Agoda)
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        try {
            const cacheKey = `unified_hotel_${cityCode}_${checkInDate}_${checkOutDate}_${adults}`;
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached unified hotel results for ${cityCode}`);
                return JSON.parse(cached);
            }
            logger.info(`Searching hotels in ${cityCode} using available providers`);
            const results = {
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
            // Aggregate from all providers in priority order
            for (const providerName of this.providerPriority) {
                const provider = this.providers[providerName];
                if (!provider) continue;
                try {
                    const isAvailable = await provider.isAvailable();
                    if (!isAvailable) {
                        logger.warn(`Provider ${providerName} is not available, skipping`);
                        continue;
                    }
                    logger.info(`Searching hotels with ${providerName}`);
                    const hotels = await provider.searchHotels(
                        cityCode,
                        checkInDate,
                        checkOutDate,
                        adults,
                        radius,
                        maxResults
                    );
                    // Add provider info to each hotel
                    const hotelsWithProvider = hotels.map(hotel => ({
                        ...hotel,
                        searchProvider: providerName
                    }));
                    results.hotels.push(...hotelsWithProvider);
                    results.providers.push({
                        name: providerName,
                        status: 'success',
                        count: hotels.length
                    });
                    logger.info(`Found ${hotels.length} hotels from ${providerName}`);
                } catch (error) {
                    logger.error(`Error searching hotels with ${providerName}: ${error.message}`);
                    results.providers.push({
                        name: providerName,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            // Sort hotels by price (lowest first, if available)
            results.hotels.sort((a, b) => {
                const priceA = a.price || (a.offers && a.offers[0]?.price?.total) || 0;
                const priceB = b.price || (b.offers && b.offers[0]?.price?.total) || 0;
                return priceA - priceB;
            });
            // Limit total results
            results.hotels = results.hotels.slice(0, maxResults * 2); // Allow more results since we're combining providers
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            logger.info(`Unified hotel search found ${results.hotels.length} total hotels from ${results.providers.length} providers`);
            return results;
        } catch (error) {
            logger.error(`Unified hotel search error: ${error.message}`);
            throw new Error(`Failed to search hotels: ${error.message}`);
        }
    }

    // Car Rental Search (primarily Amadeus)
    async searchCarRentals(pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10) {
        try {
            const cacheKey = `unified_car_${pickUpLocation}_${dropOffLocation}_${pickUpDate}_${dropOffDate}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached unified car rental results for ${pickUpLocation}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching car rentals from ${pickUpLocation} using available providers`);

            const results = {
                cars: [],
                providers: [],
                meta: {
                    pickUpLocation,
                    dropOffLocation,
                    pickUpDate,
                    dropOffDate,
                    searchTime: new Date().toISOString()
                }
            };

            // Try Amadeus first (primary car rental provider)
            const amadeusProvider = this.providers.amadeus;
            if (amadeusProvider) {
                try {
                    const isAvailable = await amadeusProvider.isAvailable();
                    if (isAvailable) {
                        const cars = await amadeusProvider.searchCarRentals(
                            pickUpLocation, 
                            dropOffLocation, 
                            pickUpDate, 
                            dropOffDate, 
                            maxResults
                        );

                        results.cars.push(...cars);
                        results.providers.push({
                            name: 'amadeus',
                            status: 'success',
                            count: cars.length
                        });

                        logger.info(`Found ${cars.length} car rentals from Amadeus`);
                    }
                } catch (error) {
                    logger.error(`Error searching car rentals with Amadeus: ${error.message}`);
                    results.providers.push({
                        name: 'amadeus',
                        status: 'error',
                        error: error.message
                    });
                }
            }

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            
            logger.info(`Unified car rental search found ${results.cars.length} total cars`);
            return results;

        } catch (error) {
            logger.error(`Unified car rental search error: ${error.message}`);
            throw new Error(`Failed to search car rentals: ${error.message}`);
        }
    }

    // Airport Search (combine results from all providers)
    async searchAirports(keyword) {
        try {
            const cacheKey = `unified_airport_${keyword.toLowerCase()}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            logger.info(`Searching airports for "${keyword}" using local DB and multiple providers`);

            const allAirports = [];
            const providerResults = {};
            const seenCodes = new Set();

            // 1. Search local airports table first
            const { pool } = require('../config/database');
            let localAirports = [];
            try {
                const localQuery = `
                    SELECT id, city, iata_code, name, country, state, latitude, longitude
                    FROM airports
                    WHERE 
                        LOWER(city) LIKE LOWER($1) OR
                        LOWER(iata_code) LIKE LOWER($1) OR
                        LOWER(name) LIKE LOWER($1)
                    LIMIT 20;
                `;
                const param = `%${keyword}%`;
                const result = await pool.query(localQuery, [param]);
                localAirports = result.rows.map(row => ({
                    id: row.id,
                    city: row.city,
                    code: row.iata_code,
                    name: row.name,
                    country: row.country,
                    state: row.state,
                    latitude: row.latitude,
                    longitude: row.longitude,
                    searchProvider: 'local'
                }));
                localAirports.forEach(airport => {
                    if (!seenCodes.has(airport.code)) {
                        seenCodes.add(airport.code);
                        allAirports.push(airport);
                    }
                });
                providerResults['local'] = { status: 'success', count: localAirports.length };
            } catch (err) {
                logger.error(`Error searching local airports: ${err.message}`);
                providerResults['local'] = { status: 'error', error: err.message };
            }

            // 2. Search each external provider
            for (const [providerName, provider] of Object.entries(this.providers)) {
                try {
                    const isAvailable = await provider.isAvailable();
                    if (!isAvailable) continue;

                    const airports = await provider.searchAirports(keyword);
                    providerResults[providerName] = {
                        status: 'success',
                        count: airports.length
                    };

                    // Add provider info to each airport
                    const airportsWithProvider = airports.map(airport => ({
                        ...airport,
                        searchProvider: providerName
                    }));

                    // Deduplicate by IATA code
                    airportsWithProvider.forEach(airport => {
                        if (!seenCodes.has(airport.code)) {
                            seenCodes.add(airport.code);
                            allAirports.push(airport);
                        }
                    });

                } catch (error) {
                    logger.error(`Error searching airports with ${providerName}: ${error.message}`);
                    providerResults[providerName] = {
                        status: 'error',
                        error: error.message
                    };
                }
            }

            const results = {
                airports: allAirports,
                providers: providerResults,
                meta: {
                    keyword,
                    searchTime: new Date().toISOString()
                }
            };

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 3600 }); // 1 hour
            
            logger.info(`Unified airport search found ${allAirports.length} unique airports`);
            return results;

        } catch (error) {
            logger.error(`Unified airport search error: ${error.message}`);
            throw new Error(`Failed to search airports: ${error.message}`);
        }
    }

    // Health check for all providers
    async healthCheck() {
        const health = {
            status: 'healthy',
            providers: {},
            timestamp: new Date().toISOString()
        };

        let allHealthy = true;

        for (const [name, provider] of Object.entries(this.providers)) {
            try {
                const providerHealth = await provider.healthCheck();
                health.providers[name] = providerHealth;
                
                if (providerHealth.status !== 'healthy') {
                    allHealthy = false;
                }
            } catch (error) {
                health.providers[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
                allHealthy = false;
            }
        }

        health.status = allHealthy ? 'healthy' : 'degraded';
        return health;
    }

    // Clear cache for specific searches
    async clearCache(type, params) {
        try {
            const keys = await redisClient.keys(`unified_${type}_*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cleared ${keys.length} unified ${type} cache entries`);
            }
        } catch (error) {
            logger.error(`Unified cache clear error: ${error.message}`);
        }
    }

    // Get provider statistics
    async getProviderStats() {
        const stats = {
            totalProviders: Object.keys(this.providers).length,
            availableProviders: 0,
            providerDetails: {}
        };

        for (const [name, provider] of Object.entries(this.providers)) {
            try {
                const isAvailable = await provider.isAvailable();
                const health = await provider.healthCheck();
                
                stats.providerDetails[name] = {
                    name: provider.getProviderName(),
                    available: isAvailable,
                    health: health.status,
                    lastCheck: new Date().toISOString()
                };

                if (isAvailable) {
                    stats.availableProviders++;
                }
            } catch (error) {
                stats.providerDetails[name] = {
                    name: provider.getProviderName(),
                    available: false,
                    health: 'unhealthy',
                    error: error.message,
                    lastCheck: new Date().toISOString()
                };
            }
        }

        return stats;
    }

    // Multi-City Flight Search
    async searchMultiCityFlights(segments, passengers = 1, maxResults = 10) {
        try {
            const cacheKey = `multicity_${JSON.stringify(segments)}_${passengers}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached multi-city flight results`);
                return JSON.parse(cached);
            }

            logger.info(`Searching multi-city flights with ${segments.length} segments`);

            const results = {
                flights: [],
                providers: [],
                meta: {
                    segments: segments.length,
                    passengers,
                    searchTime: new Date().toISOString()
                }
            };

            // Search each segment
            for (const segment of segments) {
                const { origin, destination, date } = segment;
                
                try {
                    const segmentFlights = await this.searchFlights(
                        origin,
                        destination,
                        date,
                        null, // No return date for multi-city
                        passengers,
                        Math.ceil(maxResults / segments.length) // Distribute results across segments
                    );

                    // Add segment info to each flight
                    const flightsWithSegment = segmentFlights.flights.map(flight => ({
                        ...flight,
                        segment: { origin, destination, date }
                    }));

                    results.flights.push(...flightsWithSegment);
                    
                    // Merge provider info
                    segmentFlights.providers.forEach(provider => {
                        const existingProvider = results.providers.find(p => p.name === provider.name);
                        if (existingProvider) {
                            existingProvider.count += provider.count;
                        } else {
                            results.providers.push(provider);
                        }
                    });

                } catch (error) {
                    logger.error(`Error searching segment ${origin} to ${destination}: ${error.message}`);
                    // Continue with other segments even if one fails
                }
            }

            // Sort by total price across all segments
            results.flights.sort((a, b) => a.price.total - b.price.total);

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            
            logger.info(`Multi-city search found ${results.flights.length} total flights`);
            return results;

        } catch (error) {
            logger.error(`Multi-city flight search error: ${error.message}`);
            throw new Error(`Failed to search multi-city flights: ${error.message}`);
        }
    }

    // Travel Package Search (Flight + Hotel + Car)
    async searchTravelPackages(options) {
        try {
            const {
                origin, destination, departureDate, returnDate,
                passengers = 1, includeHotel = true, includeCar = false,
                maxResults = 10
            } = options;

            const cacheKey = `package_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}_${includeHotel}_${includeCar}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached travel package results`);
                return JSON.parse(cached);
            }

            logger.info(`Searching travel packages from ${origin} to ${destination}`);

            const results = {
                packages: [],
                providers: [],
                meta: {
                    origin,
                    destination,
                    departureDate,
                    returnDate,
                    passengers,
                    includeHotel,
                    includeCar,
                    searchTime: new Date().toISOString()
                }
            };

            // Search for flights
            const flightResults = await this.searchFlights(
                origin,
                destination,
                departureDate,
                returnDate,
                passengers,
                maxResults
            );

            // For each flight, try to add hotel and car if requested
            for (const flight of flightResults.flights.slice(0, maxResults)) {
                const travelPackage = {
                    id: `package_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    flight,
                    totalPrice: flight.price.total,
                    currency: flight.price.currency
                };

                // Add hotel if requested
                if (includeHotel) {
                    try {
                        // Use destination city for hotel search
                        const cityCode = destination;
                        const checkInDate = departureDate;
                        const checkOutDate = returnDate || this.addDays(departureDate, 3); // Default 3 days if no return

                        const hotelResults = await this.searchHotels(
                            cityCode,
                            checkInDate,
                            checkOutDate,
                            passengers,
                            5, // radius
                            3   // max 3 hotels per package
                        );

                        if (hotelResults.hotels.length > 0) {
                            travelPackage.hotel = hotelResults.hotels[0]; // Best hotel
                            travelPackage.totalPrice += parseFloat(travelPackage.hotel.offers[0].price.total);
                        }
                    } catch (error) {
                        logger.warn(`Could not add hotel to package: ${error.message}`);
                    }
                }

                // Add car rental if requested
                if (includeCar) {
                    try {
                        const pickUpDate = `${departureDate}T10:00:00`;
                        const dropOffDate = returnDate ? `${returnDate}T18:00:00` : `${this.addDays(departureDate, 3)}T18:00:00`;

                        const carResults = await this.searchCarRentals(
                            destination, // Pick up at destination
                            destination, // Drop off at destination
                            pickUpDate,
                            dropOffDate,
                            3 // max 3 cars per package
                        );

                        if (carResults.length > 0) {
                            travelPackage.car = carResults[0]; // Best car
                            travelPackage.totalPrice += parseFloat(travelPackage.car.price.total);
                        }
                    } catch (error) {
                        logger.warn(`Could not add car to package: ${error.message}`);
                    }
                }

                results.packages.push(travelPackage);
            }

            // Sort packages by total price
            results.packages.sort((a, b) => a.totalPrice - b.totalPrice);

            // Merge provider info
            results.providers = flightResults.providers;

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(results), { EX: 900 }); // 15 minutes
            
            logger.info(`Travel package search found ${results.packages.length} packages`);
            return results;

        } catch (error) {
            logger.error(`Travel package search error: ${error.message}`);
            throw new Error(`Failed to search travel packages: ${error.message}`);
        }
    }

    // Helper method to add days to a date
    addDays(dateString, days) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date.toISOString().slice(0, 10);
    }
}

module.exports = new UnifiedTravelService(); 