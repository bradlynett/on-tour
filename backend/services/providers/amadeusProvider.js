const Amadeus = require('amadeus');
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

class AmadeusProvider extends TravelProviderInterface {
    constructor() {
        super();
        this.amadeus = new Amadeus({
            clientId: process.env.AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET
        });
        
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    getProviderName() {
        return 'amadeus';
    }

    async isAvailable() {
        try {
            // Test with a simple airport search
            await this.amadeus.referenceData.locations.get({
                keyword: 'LAX',
                subType: Amadeus.location.any
            });
            return true;
        } catch (error) {
            logger.error(`Amadeus availability check failed: ${error.message}`);
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
            const cacheKey = `amadeus_flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached Amadeus flight results for ${origin} to ${destination}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching Amadeus flights from ${origin} to ${destination} on ${departureDate}`);

            const searchParams = {
                originLocationCode: origin,
                destinationLocationCode: destination,
                departureDate: departureDate,
                adults: passengers,
                max: maxResults,
                currencyCode: 'USD'
            };

            if (returnDate) {
                searchParams.returnDate = returnDate;
            }

            const response = await this.amadeus.shopping.flightOffersSearch.get(searchParams);
            
            const flights = TravelResponseFormatter.formatFlightResults(response.data, this.getProviderName());
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(flights), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${flights.length} Amadeus flights from ${origin} to ${destination}`);
            return flights;

        } catch (error) {
            logger.error(`Amadeus flight search error: ${error.message}`);
            throw new Error(`Failed to search Amadeus flights: ${error.message}`);
        }
    }

    // Hotel Search
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        try {
            const cacheKey = `amadeus_hotel_${cityCode}_${checkInDate}_${checkOutDate}_${adults}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached Amadeus hotel results for ${cityCode}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching Amadeus hotels in ${cityCode} from ${checkInDate} to ${checkOutDate}`);

            const response = await this.amadeus.shopping.hotelOffers.get({
                cityCode: cityCode,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                adults: adults,
                radius: radius,
                radiusUnit: 'KM',
                max: maxResults,
                currencyCode: 'USD'
            });

            const hotels = TravelResponseFormatter.formatHotelResults(response.data, this.getProviderName());
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(hotels), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${hotels.length} Amadeus hotels in ${cityCode}`);
            return hotels;

        } catch (error) {
            logger.error(`Amadeus hotel search error: ${error.message}`);
            throw new Error(`Failed to search Amadeus hotels: ${error.message}`);
        }
    }

    // Car Rental Search
    async searchCarRentals(pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10) {
        try {
            const cacheKey = `amadeus_car_${pickUpLocation}_${dropOffLocation}_${pickUpDate}_${dropOffDate}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached Amadeus car rental results for ${pickUpLocation}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching Amadeus car rentals from ${pickUpLocation} to ${dropOffLocation}`);

            const response = await this.amadeus.shopping.carOffers.get({
                pickUpLocation: pickUpLocation,
                dropOffLocation: dropOffLocation,
                pickUpDateTime: pickUpDate,
                dropOffDateTime: dropOffDate,
                currencyCode: 'USD',
                max: maxResults
            });

            const cars = TravelResponseFormatter.formatCarResults(response.data, this.getProviderName());
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(cars), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${cars.length} Amadeus car rentals from ${pickUpLocation}`);
            return cars;

        } catch (error) {
            logger.error(`Amadeus car rental search error: ${error.message}`);
            throw new Error(`Failed to search Amadeus car rentals: ${error.message}`);
        }
    }

    // Airport/City Search
    async searchAirports(keyword) {
        try {
            const cacheKey = `amadeus_airport_${keyword.toLowerCase()}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const response = await this.amadeus.referenceData.locations.get({
                keyword: keyword,
                subType: Amadeus.location.any
            });

            const airports = TravelResponseFormatter.formatAirportResults(response.data, this.getProviderName());

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(airports), { EX: 3600 }); // 1 hour
            
            return airports;

        } catch (error) {
            logger.error(`Amadeus airport search error: ${error.message}`);
            throw new Error(`Failed to search Amadeus airports: ${error.message}`);
        }
    }

    // Get flight price history
    async getFlightPriceHistory(origin, destination, departureDate) {
        try {
            const response = await this.amadeus.shopping.flightDates.get({
                origin: origin,
                destination: destination,
                departureDate: departureDate
            });

            return response.data;

        } catch (error) {
            logger.error(`Amadeus flight price history error: ${error.message}`);
            throw new Error(`Failed to get Amadeus flight price history: ${error.message}`);
        }
    }

    // Clear cache for specific searches
    async clearCache(type, params) {
        try {
            const keys = await redisClient.keys(`amadeus_${type}_*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cleared ${keys.length} Amadeus ${type} cache entries`);
            }
        } catch (error) {
            logger.error(`Amadeus cache clear error: ${error.message}`);
        }
    }
}

module.exports = AmadeusProvider; 