const axios = require('axios');
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
const { TravelProviderInterface } = require('../travelProviderInterface');

class SerpAPIProvider extends TravelProviderInterface {
    constructor() {
        super();
        this.apiKey = process.env.SERPAPI_KEY;
        this.baseUrl = 'https://serpapi.com/search';
        
        if (!this.apiKey) {
            logger.warn('⚠️  SERPAPI_KEY not found in environment variables');
        }
    }

    getProviderName() {
        return 'serpapi';
    }

    async isAvailable() {
        return !!this.apiKey;
    }

    async healthCheck() {
        try {
            if (!this.apiKey) {
                return { status: 'unavailable', reason: 'API key not configured' };
            }

            // Test with a simple search (one-way flight)
            const testParams = {
                engine: 'google_flights',
                api_key: this.apiKey,
                departure_id: 'DEN',
                arrival_id: 'LAX',
                outbound_date: '2025-08-15',
                adults: '1',
                currency: 'USD'
            };

            const response = await axios.get(this.baseUrl, { 
                params: testParams,
                timeout: 10000 
            });

            return { 
                status: 'healthy', 
                responseTime: response.headers['x-response-time'] || 'unknown',
                dataAvailable: !!(response.data && response.data.flight_results)
            };

        } catch (error) {
            logger.error(`SerpAPI health check failed: ${error.message}`);
            return { 
                status: 'unhealthy', 
                error: error.message 
            };
        }
    }

    // Flight Search using Google Flights
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10) {
        try {
            if (!this.apiKey) {
                throw new Error('SerpAPI key not configured');
            }

            const cacheKey = `serpapi_flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached SerpAPI flight results for ${origin} to ${destination}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching SerpAPI flights from ${origin} to ${destination} on ${departureDate}`);

            const searchParams = {
                engine: 'google_flights',
                api_key: this.apiKey,
                departure_id: origin,
                arrival_id: destination,
                outbound_date: departureDate,
                adults: passengers.toString(),
                currency: 'USD',
                hl: 'en',
                type: returnDate ? 1 : 2 // 1 = round-trip, 2 = one-way
            };

            if (returnDate) {
                searchParams.return_date = returnDate;
            }

            const response = await axios.get(this.baseUrl, { 
                params: searchParams,
                timeout: 15000 
            });

            if (!response.data) {
                throw new Error('No response data from SerpAPI');
            }

            const flights = this.formatFlightResults(response.data, maxResults);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(flights), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${flights.length} SerpAPI flights from ${origin} to ${destination}`);
            return flights;

        } catch (error) {
            logger.error(`SerpAPI flight search error: ${error.message}`);
            throw new Error(`Failed to search SerpAPI flights: ${error.message}`);
        }
    }

    // Hotel Search using Google Hotels
    async searchHotels(cityOrCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        try {
            if (!this.apiKey) {
                throw new Error('SerpAPI key not configured');
            }

            const cacheKey = `serpapi_hotel_${cityOrCode}_${checkInDate}_${checkOutDate}_${adults}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached SerpAPI hotel results for ${cityOrCode}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching SerpAPI hotels in ${cityOrCode} from ${checkInDate} to ${checkOutDate}`);

            const searchParams = {
                engine: 'google_hotels',
                api_key: this.apiKey,
                q: `hotels in ${cityOrCode}`,
                check_in_date: checkInDate,
                check_out_date: checkOutDate,
                adults: adults.toString(),
                currency: 'USD',
                hl: 'en'
            };

            const response = await axios.get(this.baseUrl, { 
                params: searchParams,
                timeout: 15000 
            });

            if (!response.data) {
                throw new Error('No response data from SerpAPI');
            }

            const hotels = this.formatHotelResults(response.data, maxResults);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(hotels), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${hotels.length} SerpAPI hotels in ${cityOrCode}`);
            return hotels;

        } catch (error) {
            logger.error(`SerpAPI hotel search error: ${error.message}`);
            throw new Error(`Failed to search SerpAPI hotels: ${error.message}`);
        }
    }

    // Local Search using Google Maps
    async searchLocalPlaces(query, location, type = 'search', maxResults = 10) {
        try {
            if (!this.apiKey) {
                throw new Error('SerpAPI key not configured');
            }

            const cacheKey = `serpapi_local_${query}_${location}_${type}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached SerpAPI local results for ${query}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching SerpAPI local places: ${query} in ${location}`);

            const searchParams = {
                engine: 'google_maps',
                api_key: this.apiKey,
                q: query,
                ll: location,
                type: type,
                hl: 'en'
            };

            const response = await axios.get(this.baseUrl, { 
                params: searchParams,
                timeout: 10000 
            });

            if (!response.data) {
                throw new Error('No response data from SerpAPI');
            }

            const places = this.formatLocalResults(response.data, maxResults);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(places), { EX: 1800 }); // 30 minutes
            
            logger.info(`Found ${places.length} SerpAPI local places for ${query}`);
            return places;

        } catch (error) {
            logger.error(`SerpAPI local search error: ${error.message}`);
            throw new Error(`Failed to search SerpAPI local places: ${error.message}`);
        }
    }

    // Format flight results from SerpAPI
    formatFlightResults(data, maxResults = 10) {
        const flights = [];
        
        if (!data.flight_results || !Array.isArray(data.flight_results)) {
            return flights;
        }

        data.flight_results.slice(0, maxResults).forEach((flight, index) => {
            try {
                const formattedFlight = {
                    id: `serpapi_flight_${index}_${Date.now()}`,
                    searchProvider: 'serpapi',
                    airline: flight.airline || 'Multiple Airlines',
                    airlineCode: flight.airline_code || null,
                    flightNumber: flight.flight_number || null,
                    departureAirport: flight.departure_airport || null,
                    departureAirportName: flight.departure_airport_name || null,
                    departureCity: flight.departure_city || null,
                    arrivalAirport: flight.arrival_airport || null,
                    arrivalAirportName: flight.arrival_airport_name || null,
                    arrivalCity: flight.arrival_city || null,
                    departureTime: flight.departure_time || null,
                    arrivalTime: flight.arrival_time || null,
                    duration: flight.duration || null,
                    stops: flight.stops || 0,
                    cabinClass: flight.cabin_class || 'economy',
                    price: {
                        total: this.extractPrice(flight.price),
                        currency: 'USD',
                        base: this.extractPrice(flight.price),
                        fees: 0
                    },
                    currency: 'USD',
                    priceDetails: {
                        total: this.extractPrice(flight.price),
                        currency: 'USD',
                        base: this.extractPrice(flight.price),
                        fees: 0
                    },
                    itineraries: [{
                        duration: flight.duration || null,
                        segments: [{
                            departure: {
                                iataCode: flight.departure_airport,
                                at: flight.departure_time
                            },
                            arrival: {
                                iataCode: flight.arrival_airport,
                                at: flight.arrival_time
                            },
                            carrierCode: flight.airline_code,
                            number: flight.flight_number
                        }]
                    }],
                    numberOfBookableSeats: flight.available_seats || null,
                    fareType: 'public',
                    baggage: {
                        carryOn: flight.carry_on_baggage || null,
                        checked: flight.checked_baggage || null
                    },
                    amenities: {
                        wifi: flight.wifi || false,
                        power: flight.power_outlets || false,
                        entertainment: flight.entertainment || false
                    },
                    bookingUrl: flight.booking_url || null,
                    dataSource: 'serpapi_google_flights'
                };

                flights.push(formattedFlight);

            } catch (error) {
                logger.error(`Error formatting SerpAPI flight result: ${error.message}`);
            }
        });

        return flights;
    }

    // Format hotel results from SerpAPI
    formatHotelResults(data, maxResults = 20) {
        const hotels = [];
        
        if (!data.properties || !Array.isArray(data.properties)) {
            return hotels;
        }

        data.properties.slice(0, maxResults).forEach((property, index) => {
            try {
                // Extract price robustly
                const price = property.total_rate?.extracted_lowest || property.rate_per_night?.extracted_lowest || null;
                if (!price) {
                    logger.warn(`No price found for SerpAPI hotel:`, property);
                }
                const formattedHotel = {
                    id: `serpapi_hotel_${index}_${Date.now()}`,
                    searchProvider: 'serpapi',
                    name: property.name || 'Unknown Hotel',
                    chainCode: property.chain || null,
                    rating: property.overall_rating ? parseFloat(property.overall_rating) : null,
                    reviews: property.reviews ? parseInt(property.reviews) : null,
                    address: property.address || null,
                    city: property.city || null,
                    state: property.state || null,
                    country: property.country || null,
                    postalCode: property.postal_code || null,
                    latitude: property.gps_coordinates?.latitude || null,
                    longitude: property.gps_coordinates?.longitude || null,
                    amenities: property.amenities || [],
                    offers: [{
                        id: `serpapi_offer_${index}_${Date.now()}`,
                        roomType: 'Standard Room',
                        boardType: 'Room Only',
                        price: {
                            total: price,
                            currency: 'USD',
                            base: property.total_rate?.extracted_before_taxes_fees || property.rate_per_night?.extracted_before_taxes_fees || null,
                            taxes: 0
                        },
                        currency: 'USD',
                        cancellationPolicy: null,
                        refundable: false,
                        breakfastIncluded: property.amenities?.some(amenity => amenity.toLowerCase().includes('breakfast')) || false,
                        dataSource: 'serpapi_google_hotels'
                    }],
                    images: property.images || [],
                    bookingUrl: property.link || null,
                    dataSource: 'serpapi_google_hotels',
                    description: property.description || null,
                    hotelClass: property.hotel_class || null,
                    checkInTime: property.check_in_time || null,
                    checkOutTime: property.check_out_time || null,
                    deal: property.deal || null,
                    dealDescription: property.deal_description || null,
                    locationRating: property.location_rating || null,
                    ecoCertified: property.eco_certified || false,
                    // Always set top-level price for easy access
                    price: price
                };

                hotels.push(formattedHotel);

            } catch (error) {
                logger.error(`Error formatting SerpAPI hotel result: ${error.message}`);
            }
        });

        return hotels;
    }

    // Format local results from SerpAPI
    formatLocalResults(data, maxResults = 10) {
        const places = [];
        
        if (!data.local_results || !Array.isArray(data.local_results)) {
            return places;
        }

        data.local_results.slice(0, maxResults).forEach((place, index) => {
            try {
                const formattedPlace = {
                    id: `serpapi_place_${index}_${Date.now()}`,
                    searchProvider: 'serpapi',
                    title: place.title || 'Unknown Place',
                    address: place.address || null,
                    phone: place.phone || null,
                    website: place.website || null,
                    rating: place.rating ? parseFloat(place.rating) : null,
                    reviews: place.reviews ? parseInt(place.reviews) : null,
                    category: place.category || null,
                    hours: place.hours || null,
                    price: place.price || null,
                    latitude: place.latitude || null,
                    longitude: place.longitude || null,
                    distance: place.distance || null,
                    dataSource: 'serpapi_google_maps'
                };

                places.push(formattedPlace);

            } catch (error) {
                logger.error(`Error formatting SerpAPI local result: ${error.message}`);
            }
        });

        return places;
    }

    // Helper to extract price from various formats
    extractPrice(priceString) {
        if (!priceString) return null;
        
        // Remove currency symbols and extract numeric value
        const numericPrice = priceString.replace(/[^\d.,]/g, '');
        const price = parseFloat(numericPrice.replace(',', ''));
        
        return isNaN(price) ? null : price;
    }

    // Get pricing information
    getPricingInfo() {
        return {
            provider: 'serpapi',
            costPerSearch: 0.05, // $0.05 per search
            currency: 'USD',
            plans: {
                starter: { searches: 100, cost: 50 },
                basic: { searches: 1000, cost: 100 },
                pro: { searches: 5000, cost: 250 },
                business: { searches: 20000, cost: 500 }
            }
        };
    }
}

module.exports = SerpAPIProvider; 