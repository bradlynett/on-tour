const axios = require('axios');
const { TravelProviderInterface, TravelResponseFormatter } = require('../travelProviderInterface');
const { redisClient } = require('../../redisClient');
const winston = require('winston');

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

class SkyscannerProvider extends TravelProviderInterface {
    constructor() {
        super();
        this.apiKey = process.env.SKYSCANNER_API_KEY;
        this.baseUrl = 'https://partners.api.skyscanner.net/apiservices/v3';
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    getProviderName() {
        return 'skyscanner';
    }

    async isAvailable() {
        try {
            // Test with a simple flight search
            const response = await axios.get(`${this.baseUrl}/flights/live/search/create`, {
                headers: {
                    'x-api-key': this.apiKey
                },
                params: {
                    queryLegs: JSON.stringify([{
                        originPlaceId: 'LAX-sky',
                        destinationPlaceId: 'JFK-sky',
                        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    }]),
                    adults: '1',
                    children: '0',
                    infants: '0',
                    cabinClass: 'economy',
                    currencyCode: 'USD',
                    locale: 'en-US'
                }
            });
            return response.status === 200;
        } catch (error) {
            logger.error(`Skyscanner availability check failed: ${error.message}`);
            return false;
        }
    }

    async healthCheck() {
        try {
            const isAvailable = await this.isAvailable();
            return {
                provider: this.getProviderName(),
                status: isAvailable ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                provider: this.getProviderName(),
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Flight Search
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10) {
        try {
            const cacheKey = `skyscanner_flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached Skyscanner flight results for ${origin} to ${destination}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching Skyscanner flights from ${origin} to ${destination} on ${departureDate}`);

            // Create search session
            const searchParams = {
                queryLegs: JSON.stringify([{
                    originPlaceId: `${origin}-sky`,
                    destinationPlaceId: `${destination}-sky`,
                    date: departureDate
                }]),
                adults: passengers.toString(),
                children: '0',
                infants: '0',
                cabinClass: 'economy',
                currencyCode: 'USD',
                locale: 'en-US'
            };

            if (returnDate) {
                searchParams.queryLegs = JSON.stringify([
                    {
                        originPlaceId: `${origin}-sky`,
                        destinationPlaceId: `${destination}-sky`,
                        date: departureDate
                    },
                    {
                        originPlaceId: `${destination}-sky`,
                        destinationPlaceId: `${origin}-sky`,
                        date: returnDate
                    }
                ]);
            }

            // Create search session
            const createResponse = await axios.get(`${this.baseUrl}/flights/live/search/create`, {
                headers: {
                    'x-api-key': this.apiKey
                },
                params: searchParams
            });

            if (createResponse.status !== 200) {
                throw new Error('Failed to create Skyscanner search session');
            }

            const sessionToken = createResponse.data.sessionToken;

            // Poll for results
            let attempts = 0;
            const maxAttempts = 10;
            let results = null;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

                const pollResponse = await axios.get(`${this.baseUrl}/flights/live/search/poll/${sessionToken}`, {
                    headers: {
                        'x-api-key': this.apiKey
                    }
                });

                if (pollResponse.data.status === 'COMPLETE') {
                    results = pollResponse.data;
                    break;
                }

                attempts++;
            }

            if (!results) {
                throw new Error('Skyscanner search timed out');
            }

            // Format results
            const flights = this.formatSkyscannerFlights(results, maxResults);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(flights), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${flights.length} Skyscanner flights from ${origin} to ${destination}`);
            return flights;

        } catch (error) {
            logger.error(`Skyscanner flight search error: ${error.message}`);
            throw new Error(`Failed to search Skyscanner flights: ${error.message}`);
        }
    }

    formatSkyscannerFlights(data, maxResults) {
        const flights = [];
        const itineraries = data.itineraries || {};
        const legs = data.legs || {};
        const carriers = data.carriers || {};
        const places = data.places || {};

        // Process each itinerary
        Object.entries(itineraries).slice(0, maxResults).forEach(([itineraryId, itinerary]) => {
            const pricingOptions = itinerary.pricingOptions || [];
            
            pricingOptions.forEach(option => {
                const leg = legs[itinerary.legIds[0]];
                if (!leg) return;

                const departurePlace = places[leg.originPlaceId];
                const arrivalPlace = places[leg.destinationPlaceId];
                const carrier = carriers[leg.marketingCarrierId];

                const flight = {
                    id: `${itineraryId}_${option.id}`,
                    provider: this.getProviderName(),
                    price: {
                        total: option.price.amount,
                        currency: option.price.currency,
                        base: option.price.amount * 0.8, // Estimate base fare
                        fees: option.price.amount * 0.2 // Estimate fees
                    },
                    itineraries: [{
                        duration: leg.durationInMinutes,
                        segments: [{
                            departure: {
                                airport: departurePlace?.iata || departurePlace?.name,
                                terminal: null,
                                time: leg.departure
                            },
                            arrival: {
                                airport: arrivalPlace?.iata || arrivalPlace?.name,
                                terminal: null,
                                time: leg.arrival
                            },
                            carrier: carrier?.name || 'Unknown',
                            flightNumber: leg.marketingCarrierFlightNumber,
                            aircraft: null,
                            duration: leg.durationInMinutes
                        }]
                    }],
                    numberOfBookableSeats: null,
                    cabinClass: 'economy',
                    fareType: 'public'
                };

                flights.push(flight);
            });
        });

        return TravelResponseFormatter.formatFlightResults(flights, this.getProviderName());
    }

    // Hotel Search (Skyscanner doesn't provide hotel search, so we'll return empty)
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        logger.info('Skyscanner does not provide hotel search');
        return [];
    }

    // Car Rental Search (Skyscanner doesn't provide car rental search, so we'll return empty)
    async searchCarRentals(pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10) {
        logger.info('Skyscanner does not provide car rental search');
        return [];
    }

    // Airport/City Search
    async searchAirports(keyword) {
        try {
            const cacheKey = `skyscanner_airport_${keyword.toLowerCase()}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const response = await axios.get(`${this.baseUrl}/autosuggest/flights`, {
                headers: {
                    'x-api-key': this.apiKey
                },
                params: {
                    query: keyword,
                    locale: 'en-US'
                }
            });

            const airports = response.data.places || [];
            const formattedAirports = airports.map(place => ({
                code: place.iata || place.entityId,
                name: place.name,
                city: place.cityName,
                country: place.countryName,
                type: place.type,
                provider: this.getProviderName()
            }));

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(formattedAirports), { EX: 3600 }); // 1 hour
            
            return formattedAirports;

        } catch (error) {
            logger.error(`Skyscanner airport search error: ${error.message}`);
            throw new Error(`Failed to search Skyscanner airports: ${error.message}`);
        }
    }

    // Get flight price alerts (Skyscanner specialty)
    async createPriceAlert(origin, destination, departureDate, targetPrice, email) {
        try {
            const response = await axios.post(`${this.baseUrl}/price-alerts`, {
                originPlaceId: `${origin}-sky`,
                destinationPlaceId: `${destination}-sky`,
                date: departureDate,
                targetPrice: targetPrice,
                email: email
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            logger.error(`Skyscanner price alert creation error: ${error.message}`);
            throw new Error(`Failed to create Skyscanner price alert: ${error.message}`);
        }
    }

    // Get flight price history
    async getFlightPriceHistory(origin, destination, departureDate) {
        try {
            const response = await axios.get(`${this.baseUrl}/flights/historic/price/v1.0`, {
                headers: {
                    'x-api-key': this.apiKey
                },
                params: {
                    originPlace: `${origin}-sky`,
                    destinationPlace: `${destination}-sky`,
                    outboundDate: departureDate,
                    currency: 'USD',
                    locale: 'en-US'
                }
            });

            return response.data;
        } catch (error) {
            logger.error(`Skyscanner flight price history error: ${error.message}`);
            throw new Error(`Failed to get Skyscanner flight price history: ${error.message}`);
        }
    }

    // Clear cache for specific searches
    async clearCache(type, params) {
        try {
            const keys = await redisClient.keys(`skyscanner_${type}_*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cleared ${keys.length} Skyscanner ${type} cache entries`);
            }
        } catch (error) {
            logger.error(`Skyscanner cache clear error: ${error.message}`);
        }
    }
}

module.exports = SkyscannerProvider; 