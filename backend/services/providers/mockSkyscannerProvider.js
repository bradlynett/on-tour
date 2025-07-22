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

class MockSkyscannerProvider extends TravelProviderInterface {
    constructor() {
        super();
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    getProviderName() {
        return 'skyscanner';
    }

    async isAvailable() {
        return true; // Mock provider is always available
    }

    async healthCheck() {
        return {
            provider: this.getProviderName(),
            status: 'healthy',
            note: 'Mock provider for development',
            timestamp: new Date().toISOString()
        };
    }

    // Flight Search
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10) {
        try {
            const cacheKey = `mock_skyscanner_flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached mock Skyscanner flight results for ${origin} to ${destination}`);
                return JSON.parse(cached);
            }

            logger.info(`Generating mock Skyscanner flights from ${origin} to ${destination} on ${departureDate}`);

            // Generate mock flight data
            const flights = this.generateMockFlights(origin, destination, departureDate, returnDate, passengers, maxResults);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(flights), { EX: 900 }); // 15 minutes
            
            logger.info(`Generated ${flights.length} mock Skyscanner flights from ${origin} to ${destination}`);
            return flights;

        } catch (error) {
            logger.error(`Mock Skyscanner flight search error: ${error.message}`);
            throw new Error(`Failed to generate mock Skyscanner flights: ${error.message}`);
        }
    }

    generateMockFlights(origin, destination, departureDate, returnDate, passengers, maxResults) {
        const flights = [];
        const airlines = ['British Airways', 'EasyJet', 'Ryanair', 'Lufthansa', 'Air France', 'KLM', 'Iberia'];
        const aircraft = ['Boeing 737', 'Airbus A320', 'Boeing 787', 'Airbus A350'];
        
        const departureTime = new Date(departureDate);
        const returnTime = returnDate ? new Date(returnDate) : null;

        for (let i = 0; i < Math.min(maxResults, 8); i++) {
            // Outbound flight
            const outboundDeparture = new Date(departureTime);
            outboundDeparture.setHours(6 + (i * 2), 0, 0, 0); // Spread flights throughout the day
            
            const outboundArrival = new Date(outboundDeparture);
            outboundArrival.setHours(outboundDeparture.getHours() + 2 + Math.floor(Math.random() * 3));

            const outboundFlight = {
                id: `mock_skyscanner_${origin}_${destination}_${i}_out`,
                provider: this.getProviderName(),
                price: {
                    total: Math.floor(Math.random() * 400) + 150,
                    currency: 'USD',
                    base: Math.floor(Math.random() * 300) + 100,
                    fees: Math.floor(Math.random() * 50) + 20
                },
                itineraries: [{
                    duration: 120 + Math.floor(Math.random() * 180), // 2-5 hours
                    segments: [{
                        departure: {
                            airport: origin,
                            terminal: Math.floor(Math.random() * 3) + 1,
                            time: outboundDeparture.toISOString()
                        },
                        arrival: {
                            airport: destination,
                            terminal: Math.floor(Math.random() * 3) + 1,
                            time: outboundArrival.toISOString()
                        },
                        carrier: airlines[Math.floor(Math.random() * airlines.length)],
                        flightNumber: `${Math.floor(Math.random() * 9999) + 1000}`,
                        aircraft: aircraft[Math.floor(Math.random() * aircraft.length)],
                        duration: 120 + Math.floor(Math.random() * 180)
                    }]
                }],
                numberOfBookableSeats: Math.floor(Math.random() * 10) + 1,
                cabinClass: 'economy',
                fareType: 'public'
            };

            flights.push(outboundFlight);

            // Return flight if specified
            if (returnTime && i < 4) { // Limit return flights
                const returnDeparture = new Date(returnTime);
                returnDeparture.setHours(14 + (i * 2), 0, 0, 0);
                
                const returnArrival = new Date(returnDeparture);
                returnArrival.setHours(returnDeparture.getHours() + 2 + Math.floor(Math.random() * 3));

                const returnFlight = {
                    id: `mock_skyscanner_${destination}_${origin}_${i}_return`,
                    provider: this.getProviderName(),
                    price: {
                        total: Math.floor(Math.random() * 400) + 150,
                        currency: 'USD',
                        base: Math.floor(Math.random() * 300) + 100,
                        fees: Math.floor(Math.random() * 50) + 20
                    },
                    itineraries: [{
                        duration: 120 + Math.floor(Math.random() * 180),
                        segments: [{
                            departure: {
                                airport: destination,
                                terminal: Math.floor(Math.random() * 3) + 1,
                                time: returnDeparture.toISOString()
                            },
                            arrival: {
                                airport: origin,
                                terminal: Math.floor(Math.random() * 3) + 1,
                                time: returnArrival.toISOString()
                            },
                            carrier: airlines[Math.floor(Math.random() * airlines.length)],
                            flightNumber: `${Math.floor(Math.random() * 9999) + 1000}`,
                            aircraft: aircraft[Math.floor(Math.random() * aircraft.length)],
                            duration: 120 + Math.floor(Math.random() * 180)
                        }]
                    }],
                    numberOfBookableSeats: Math.floor(Math.random() * 10) + 1,
                    cabinClass: 'economy',
                    fareType: 'public'
                };

                flights.push(returnFlight);
            }
        }

        return TravelResponseFormatter.formatFlightResults(flights, this.getProviderName());
    }

    // Hotel Search (Skyscanner doesn't provide hotel search, so we'll return empty)
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        logger.info('Mock Skyscanner does not provide hotel search');
        return [];
    }

    // Car Rental Search (Skyscanner doesn't provide car rental search, so we'll return empty)
    async searchCarRentals(pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10) {
        logger.info('Mock Skyscanner does not provide car rental search');
        return [];
    }

    // Airport/City Search
    async searchAirports(keyword) {
        try {
            const cacheKey = `mock_skyscanner_airport_${keyword.toLowerCase()}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // Generate mock airport data
            const mockAirports = this.generateMockAirports(keyword);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(mockAirports), { EX: 3600 }); // 1 hour
            
            return mockAirports;

        } catch (error) {
            logger.error(`Mock Skyscanner airport search error: ${error.message}`);
            throw new Error(`Failed to search mock Skyscanner airports: ${error.message}`);
        }
    }

    generateMockAirports(keyword) {
        const airports = [
            { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
            { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
            { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom' },
            { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
            { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
            { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
            { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain' },
            { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain' },
            { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany' },
            { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' }
        ];

        // Filter airports based on keyword
        const filtered = airports.filter(airport => 
            airport.code.toLowerCase().includes(keyword.toLowerCase()) ||
            airport.name.toLowerCase().includes(keyword.toLowerCase()) ||
            airport.city.toLowerCase().includes(keyword.toLowerCase())
        );

        return filtered.map(airport => ({
            ...airport,
            type: 'airport',
            provider: this.getProviderName()
        }));
    }

    // Mock price alert creation
    async createPriceAlert(origin, destination, departureDate, targetPrice, email) {
        logger.info(`Mock Skyscanner price alert created for ${origin} to ${destination}`);
        return {
            id: `mock_alert_${Date.now()}`,
            status: 'created',
            message: 'Mock price alert created successfully'
        };
    }

    // Mock flight price history
    async getFlightPriceHistory(origin, destination, departureDate) {
        logger.info(`Mock Skyscanner price history requested for ${origin} to ${destination}`);
        return {
            prices: [
                { date: '2024-01-01', price: 250 },
                { date: '2024-01-02', price: 245 },
                { date: '2024-01-03', price: 260 },
                { date: '2024-01-04', price: 235 },
                { date: '2024-01-05', price: 240 }
            ]
        };
    }

    // Clear cache for specific searches
    async clearCache(type, params) {
        try {
            const keys = await redisClient.keys(`mock_skyscanner_${type}_*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cleared ${keys.length} mock Skyscanner ${type} cache entries`);
            }
        } catch (error) {
            logger.error(`Mock Skyscanner cache clear error: ${error.message}`);
        }
    }
}

module.exports = MockSkyscannerProvider; 