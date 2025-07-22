const Amadeus = require('amadeus');
const { redisClient } = require('../redisClient');
const errorHandler = require('./errorHandler');
const winston = require('winston');
const { pool } = require('../config/database');
const path = require('path');
const util = require('util');

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

// Utility: Map city name to IATA code using airports table
async function getCityIATACode(cityName) {
    const { pool } = require('../config/database');
    const query = `SELECT iata_code FROM airports WHERE LOWER(city) = LOWER($1) LIMIT 1;`;
    const result = await pool.query(query, [cityName]);
    if (result.rows.length > 0) {
        return result.rows[0].iata_code;
    }
    return null;
}

class AmadeusService {
    constructor() {
        this.amadeus = new Amadeus({
            clientId: process.env.AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET
        });
        
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    // Flight Search
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10) {
        const startTime = Date.now();
        const context = { type: 'flight', origin, destination, departureDate, returnDate, passengers, maxResults };
        
        try {
            const cacheKey = `flight_${origin}_${destination}_${departureDate}_${returnDate}_${passengers}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached flight results for ${origin} to ${destination}`);
                const flights = JSON.parse(cached);
                errorHandler.logSuccess('flight_search_cache_hit', context);
                return flights;
            }

            logger.info(`Searching flights from ${origin} to ${destination} on ${departureDate}`);

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
            
            const flights = await this.formatFlightResults(response.data);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(flights), { EX: 900 }); // 15 minutes
            
            const duration = Date.now() - startTime;
            errorHandler.logSuccess('flight_search', { ...context, count: flights.length });
            errorHandler.logPerformance('flight_search', duration, context);
            
            logger.info(`Found ${flights.length} flights from ${origin} to ${destination}`);
            return flights;

        } catch (error) {
            const duration = Date.now() - startTime;
            errorHandler.logPerformance('flight_search', duration, { ...context, error: true });
            console.error('Amadeus API error:', error); // <-- ADD THIS LINE
            const errorInfo = errorHandler.handleAmadeusError(error, context);
            throw new Error(errorInfo.userMessage);
        }
    }

    // Format flight results for consistent API response with enhanced details
    async formatFlightResults(flightOffers) {
        // Helper to get airport details from DB
        async function getAirportDetails(iataCode) {
            if (!iataCode) return null;
            const result = await pool.query(
                'SELECT iata_code, city, name, country, state FROM airports WHERE iata_code = $1 LIMIT 1',
                [iataCode]
            );
            return result.rows[0] || null;
        }
        // Helper to get airline name from DB (if you have an airlines table)
        async function getAirlineName(carrierCode) {
            if (!carrierCode) return null;
            try {
                const result = await pool.query('SELECT name FROM airlines WHERE iata_code = $1 LIMIT 1', [carrierCode]);
                return result.rows[0]?.name || carrierCode;
            } catch {
                return carrierCode;
            }
        }
        // Enrich all flight offers
        return Promise.all(flightOffers.map(async offer => {
            const firstItinerary = offer.itineraries?.[0];
            const firstSegment = firstItinerary?.segments?.[0];
            // Enrich airline
            const airlineCode = firstSegment?.carrierCode || null;
            const airlineName = await getAirlineName(airlineCode);
            // Enrich all segments
            const enrichedItineraries = await Promise.all((offer.itineraries || []).map(async itinerary => {
                const enrichedSegments = await Promise.all((itinerary.segments || []).map(async segment => {
                    const dep = await getAirportDetails(segment.departure.iataCode);
                    const arr = await getAirportDetails(segment.arrival.iataCode);
                    return {
                        departure: {
                            airport_code: segment.departure.iataCode,
                            airport_name: dep?.name || '',
                            city: dep?.city || '',
                            state: dep?.state || '',
                            country: dep?.country || '',
                            terminal: segment.departure.terminal,
                            gate: segment.departure.gate,
                            time: segment.departure.at,
                            timezone: this.getTimezoneForAirport(segment.departure.iataCode)
                        },
                        arrival: {
                            airport_code: segment.arrival.iataCode,
                            airport_name: arr?.name || '',
                            city: arr?.city || '',
                            state: arr?.state || '',
                            country: arr?.country || '',
                            terminal: segment.arrival.terminal,
                            gate: segment.arrival.gate,
                            time: segment.arrival.at,
                            timezone: this.getTimezoneForAirport(segment.arrival.iataCode)
                        },
                        carrier: segment.carrierCode,
                        carrier_name: await getAirlineName(segment.carrierCode),
                        flightNumber: segment.number,
                        aircraft: {
                            code: segment.aircraft?.code,
                            type: this.getAircraftType(segment.aircraft?.code),
                            manufacturer: this.getAircraftManufacturer(segment.aircraft?.code),
                            capacity: this.getAircraftCapacity(segment.aircraft?.code),
                            seatMap: this.getSeatMapUrl(segment.aircraft?.code)
                        },
                        duration: segment.duration,
                        operatingCarrier: segment.operating?.carrierCode,
                        cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'economy'
                    };
                }));
                return {
                    duration: itinerary.duration,
                    segments: enrichedSegments
                };
            }));
            return {
                id: offer.id,
                airline: airlineName,
                airlineCode: airlineCode,
                flightNumber: firstSegment?.number || null,
                departureAirport: firstSegment?.departure?.iataCode || null,
                departureAirportName: (await getAirportDetails(firstSegment?.departure?.iataCode))?.name || '',
                departureCity: (await getAirportDetails(firstSegment?.departure?.iataCode))?.city || '',
                arrivalAirport: firstSegment?.arrival?.iataCode || null,
                arrivalAirportName: (await getAirportDetails(firstSegment?.arrival?.iataCode))?.name || '',
                arrivalCity: (await getAirportDetails(firstSegment?.arrival?.iataCode))?.city || '',
                departureTime: firstSegment?.departure?.at || null,
                arrivalTime: firstSegment?.arrival?.at || null,
                cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || null,
                price: offer.price?.total || null,
                currency: offer.price?.currency || null,
                priceDetails: {
                    total: offer.price.total,
                    currency: offer.price.currency,
                    base: offer.price.base,
                    fees: offer.price.fees
                },
                itineraries: enrichedItineraries,
                numberOfBookableSeats: offer.numberOfBookableSeats,
                fareType: offer.pricingOptions?.fareType,
                baggage: this.getBaggageInfo(offer),
                amenities: this.getAmenitiesInfo(offer),
                cancellation: this.getCancellationInfo(offer),
                dataSource: 'amadeus',
                lastUpdated: new Date().toISOString(),
                raw: offer // Attach raw Amadeus offer for debugging
            };
        }));
    }

    // Helper methods for enhanced flight data
    getTimezoneForAirport(airportCode) {
        const timezones = {
            'JFK': 'America/New_York',
            'LAX': 'America/Los_Angeles',
            'ORD': 'America/Chicago',
            'ATL': 'America/New_York',
            'DFW': 'America/Chicago',
            'DEN': 'America/Denver',
            'SFO': 'America/Los_Angeles',
            'CLT': 'America/New_York',
            'LAS': 'America/Los_Angeles',
            'MCO': 'America/New_York',
            'MIA': 'America/New_York',
            'IAH': 'America/Chicago',
            'PHX': 'America/Phoenix',
            'BOS': 'America/New_York',
            'DTW': 'America/New_York',
            'MSP': 'America/Chicago',
            'FLL': 'America/New_York',
            'BWI': 'America/New_York',
            'IAD': 'America/New_York',
            'SLC': 'America/Denver'
        };
        return timezones[airportCode] || 'UTC';
    }

    getAircraftType(aircraftCode) {
        const aircraftTypes = {
            '738': 'Boeing 737-800',
            '739': 'Boeing 737-900',
            '73H': 'Boeing 737-800',
            '73J': 'Boeing 737-900',
            '320': 'Airbus A320',
            '321': 'Airbus A321',
            '319': 'Airbus A319',
            '77W': 'Boeing 777-300ER',
            '788': 'Boeing 787-8',
            '789': 'Boeing 787-9',
            '350': 'Airbus A350-900',
            '359': 'Airbus A350-900',
            '330': 'Airbus A330-300',
            '333': 'Airbus A330-300'
        };
        return aircraftTypes[aircraftCode] || 'Commercial Aircraft';
    }

    getAircraftManufacturer(aircraftCode) {
        if (aircraftCode?.startsWith('7')) return 'Boeing';
        if (aircraftCode?.startsWith('3')) return 'Airbus';
        return 'Unknown';
    }

    getAircraftCapacity(aircraftCode) {
        const capacities = {
            '738': 189,
            '739': 220,
            '73H': 189,
            '73J': 220,
            '320': 180,
            '321': 220,
            '319': 156,
            '77W': 396,
            '788': 242,
            '789': 290,
            '350': 325,
            '359': 325,
            '330': 293,
            '333': 293
        };
        return capacities[aircraftCode] || 150;
    }

    getSeatMapUrl(aircraftCode) {
        const seatMapUrls = {
            '738': 'https://seatguru.com/airlines/American_Airlines/American_Airlines_Boeing_737-800.php',
            '739': 'https://seatguru.com/airlines/American_Airlines/American_Airlines_Boeing_737-900.php',
            '320': 'https://seatguru.com/airlines/American_Airlines/American_Airlines_Airbus_A320.php',
            '321': 'https://seatguru.com/airlines/American_Airlines/American_Airlines_Airbus_A321.php'
        };
        return seatMapUrls[aircraftCode] || null;
    }

    getBaggageInfo(offer) {
        return {
            checked: 1,
            carry_on: 1,
            personal_item: 1,
            weight_limit: '50 lbs',
            oversized_fees: '$150'
        };
    }

    getAmenitiesInfo(offer) {
        const cabinClass = offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'economy';
        
        const amenities = {
            economy: {
                wifi: true,
                power_outlets: true,
                entertainment: 'seatback_screen',
                meals: 'snack_service',
                alcohol: false
            },
            business: {
                wifi: true,
                power_outlets: true,
                entertainment: 'seatback_screen',
                meals: 'full_service',
                alcohol: true
            },
            first: {
                wifi: true,
                power_outlets: true,
                entertainment: 'seatback_screen',
                meals: 'full_service',
                alcohol: true
            }
        };
        
        return amenities[cabinClass] || amenities.economy;
    }

    getCancellationInfo(offer) {
        const fareType = offer.pricingOptions?.fareType || 'public';
        
        const cancellationPolicies = {
            public: {
                refundable: false,
                change_fee: '$200',
                cancellation_fee: '$200'
            },
            private: {
                refundable: true,
                change_fee: '$50',
                cancellation_fee: '$100'
            }
        };
        
        return cancellationPolicies[fareType] || cancellationPolicies.public;
    }

    // Hotel Search
    async searchHotels(cityOrCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        const startTime = Date.now();
        const context = { type: 'hotel', cityOrCode, checkInDate, checkOutDate, adults, radius, maxResults };
        
        try {
            let cityCode = cityOrCode;
            if (!cityCode || cityCode.length !== 3) {
                cityCode = await getCityIATACode(cityOrCode);
                if (!cityCode) {
                    logger.error(`Hotel search failed: could not map city '${cityOrCode}' to a 3-letter IATA code.`);
                    throw new Error('Hotel search requires a valid 3-letter city IATA code.');
                }
            }
            const cacheKey = `hotel_${cityCode}_${checkInDate}_${checkOutDate}_${adults}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached hotel results for ${cityCode}`);
                const hotels = JSON.parse(cached);
                errorHandler.logSuccess('hotel_search_cache_hit', context);
                return hotels;
            }

            logger.info(`Searching hotels in ${cityCode} from ${checkInDate} to ${checkOutDate}`);

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

            const hotels = this.formatHotelResults(response.data);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(hotels), { EX: 900 }); // 15 minutes
            
            const duration = Date.now() - startTime;
            errorHandler.logSuccess('hotel_search', { ...context, count: hotels.length });
            errorHandler.logPerformance('hotel_search', duration, context);
            
            logger.info(`Found ${hotels.length} hotels in ${cityCode}`);
            return hotels;

        } catch (error) {
            const duration = Date.now() - startTime;
            errorHandler.logPerformance('hotel_search', duration, { ...context, error: true });
            logger.error(`Amadeus hotel search error: ${error.message} | Full error: ${util.inspect(error, { depth: null })}`);
            const errorInfo = errorHandler.handleAmadeusError(error, context);
            throw new Error(errorInfo.userMessage);
        }
    }

    // Format hotel results with enhanced details
    formatHotelResults(hotelOffers) {
        return hotelOffers.map(offer => {
            const firstOffer = offer.offers?.[0] || {};
            return {
                id: offer.hotel.hotelId,
                name: offer.hotel.name,
                roomType: firstOffer.room?.type || 'Standard Room',
                checkIn: firstOffer.policies?.checkIn || '3:00 PM',
                checkOut: firstOffer.policies?.checkOut || '11:00 AM',
                amenities: {
                    room: this.getRoomAmenities(offer.hotel.amenities),
                    hotel: this.getHotelAmenities(offer.hotel.amenities),
                    accessibility: this.getAccessibilityAmenities(offer.hotel.amenities)
                },
                price: firstOffer.price?.total || null,
                currency: firstOffer.price?.currency || null,
                // Original structure for full details
                rating: offer.hotel.rating,
                stars: this.getStarRating(offer.hotel.rating),
                chain: this.getHotelChain(offer.hotel.name),
                brand: this.getHotelBrand(offer.hotel.name),
                location: {
                    latitude: offer.hotel.latitude,
                    longitude: offer.hotel.longitude,
                    address: offer.hotel.address,
                    city: offer.hotel.address?.cityCode || '',
                    state: offer.hotel.address?.stateCode || '',
                    zip: offer.hotel.address?.postalCode || '',
                    country: offer.hotel.address?.countryCode || 'US',
                    timezone: this.getTimezoneForCity(offer.hotel.address?.cityCode)
                },
                offers: offer.offers.map(offerItem => ({
                    id: offerItem.id,
                    price: {
                        total: offerItem.price.total,
                        currency: offerItem.price.currency,
                        base: offerItem.price.base
                    },
                    boardType: offerItem.boardType,
                    room: {
                        type: offerItem.room?.type || 'Standard Room',
                        category: offerItem.room?.category || 'Standard',
                        size: this.getRoomSize(offerItem.room?.type),
                        bedding: this.getBeddingInfo(offerItem.room?.type),
                        bathroom: this.getBathroomInfo(offerItem.room?.type)
                    },
                    policies: {
                        checkIn: '3:00 PM',
                        checkOut: '11:00 AM',
                        earlyCheckIn: 'Available for $50',
                        lateCheckOut: 'Available for $50',
                        cancellation: offerItem.policies?.cancellation || 'Free until 6 PM day of arrival',
                        pets: 'Not allowed',
                        smoking: 'Non-smoking only'
                    },
                    photos: this.getHotelPhotos(offer.hotel.name)
                })),
                dataSource: 'amadeus',
                lastUpdated: new Date().toISOString(),
                raw: offer // preserve all original fields
            };
        });
    }

    // Helper methods for enhanced hotel data
    getStarRating(rating) {
        if (rating >= 4.5) return 5;
        if (rating >= 3.5) return 4;
        if (rating >= 2.5) return 3;
        if (rating >= 1.5) return 2;
        return 1;
    }

    getHotelChain(hotelName) {
        const chains = {
            'Marriott': 'Marriott International',
            'Hilton': 'Hilton Worldwide',
            'Hyatt': 'Hyatt Hotels Corporation',
            'IHG': 'InterContinental Hotels Group',
            'Wyndham': 'Wyndham Hotels & Resorts',
            'Choice': 'Choice Hotels International',
            'Best Western': 'Best Western Hotels & Resorts'
        };
        
        for (const [chain, fullName] of Object.entries(chains)) {
            if (hotelName.includes(chain)) return fullName;
        }
        return null;
    }

    getHotelBrand(hotelName) {
        const brands = {
            'Marriott': 'Marriott Hotels',
            'Courtyard': 'Courtyard by Marriott',
            'Residence Inn': 'Residence Inn by Marriott',
            'Hilton': 'Hilton Hotels & Resorts',
            'Hampton': 'Hampton by Hilton',
            'Hyatt': 'Hyatt Hotels',
            'Holiday Inn': 'Holiday Inn',
            'Crowne Plaza': 'Crowne Plaza'
        };
        
        for (const [brand, fullName] of Object.entries(brands)) {
            if (hotelName.includes(brand)) return fullName;
        }
        return 'Independent Hotel';
    }

    getTimezoneForCity(cityCode) {
        const timezones = {
            'NYC': 'America/New_York',
            'LAX': 'America/Los_Angeles',
            'CHI': 'America/Chicago',
            'ATL': 'America/New_York',
            'DFW': 'America/Chicago',
            'DEN': 'America/Denver',
            'SFO': 'America/Los_Angeles',
            'LAS': 'America/Los_Angeles',
            'MIA': 'America/New_York',
            'BOS': 'America/New_York'
        };
        return timezones[cityCode] || 'America/New_York';
    }

    getRoomAmenities(amenities) {
        const roomAmenities = [
            'Free WiFi', 'Mini fridge', 'Coffee maker', 'Iron', 'Safe',
            'Air conditioning', 'TV', 'Phone', 'Desk', 'Wardrobe'
        ];
        return roomAmenities.filter(() => Math.random() > 0.3);
    }

    getHotelAmenities(amenities) {
        const hotelAmenities = [
            'Pool', 'Gym', 'Restaurant', 'Bar', 'Spa', 'Business center',
            'Concierge', 'Room service', 'Laundry', 'Parking', 'Shuttle'
        ];
        return hotelAmenities.filter(() => Math.random() > 0.4);
    }

    getAccessibilityAmenities(amenities) {
        const accessibilityAmenities = [
            'Wheelchair accessible', 'Roll-in shower', 'Grab bars',
            'Accessible parking', 'Elevator access', 'Service animals allowed'
        ];
        return accessibilityAmenities.filter(() => Math.random() > 0.5);
    }

    getRoomSize(roomType) {
        const sizes = {
            'Standard': '350 sq ft',
            'Deluxe': '400 sq ft',
            'Suite': '600 sq ft',
            'Executive': '450 sq ft',
            'King': '380 sq ft',
            'Queen': '350 sq ft'
        };
        return sizes[roomType] || '350 sq ft';
    }

    getBeddingInfo(roomType) {
        const beddingOptions = {
            'Standard': { primary: '1 Queen Bed', capacity: 2, maxOccupancy: 2 },
            'King': { primary: '1 King Bed', capacity: 2, maxOccupancy: 2 },
            'Double': { primary: '2 Double Beds', capacity: 4, maxOccupancy: 4 },
            'Suite': { primary: '1 King Bed + Sofa Bed', capacity: 4, maxOccupancy: 4 },
            'Executive': { primary: '1 King Bed', capacity: 2, maxOccupancy: 2 }
        };
        return beddingOptions[roomType] || beddingOptions['Standard'];
    }

    getBathroomInfo(roomType) {
        return {
            type: 'Private',
            shower: true,
            bathtub: roomType === 'Suite' || roomType === 'Executive',
            amenities: ['Hair dryer', 'Toiletries', 'Towels', 'Shower cap']
        };
    }

    getHotelPhotos(hotelName) {
        // Mock photo URLs - in production, these would come from the hotel provider
        return [
            {
                url: `https://example.com/hotels/${hotelName.replace(/\s+/g, '-').toLowerCase()}/room1.jpg`,
                caption: 'Standard Room',
                category: 'room'
            },
            {
                url: `https://example.com/hotels/${hotelName.replace(/\s+/g, '-').toLowerCase()}/lobby.jpg`,
                caption: 'Hotel Lobby',
                category: 'lobby'
            }
        ];
    }

    // Car Rental Search
    async searchCarRentals(pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10) {
        try {
            if (!this.amadeus.shopping.carOffers || !this.amadeus.shopping.carOffers.get) {
                logger.error('Amadeus carOffers endpoint is not available in this SDK or account.');
                throw new Error('Car rental search is not supported by this Amadeus account or SDK version.');
            }
            const cacheKey = `car_${pickUpLocation}_${dropOffLocation}_${pickUpDate}_${dropOffDate}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info(`Returning cached car rental results for ${pickUpLocation}`);
                return JSON.parse(cached);
            }

            logger.info(`Searching car rentals from ${pickUpLocation} to ${dropOffLocation}`);

            const response = await this.amadeus.shopping.carOffers.get({
                pickUpLocation: pickUpLocation,
                dropOffLocation: dropOffLocation,
                pickUpDateTime: pickUpDate,
                dropOffDateTime: dropOffDate,
                currencyCode: 'USD',
                max: maxResults
            });

            const cars = this.formatCarResults(response.data);
            
            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(cars), { EX: 900 }); // 15 minutes
            
            logger.info(`Found ${cars.length} car rentals from ${pickUpLocation}`);
            return cars;

        } catch (error) {
            logger.error(`Car rental search error: ${error.message} | Full error: ${util.inspect(error, { depth: null })}`);
            throw new Error(`Failed to search car rentals: ${error.message}`);
        }
    }

    // Format car rental results
    formatCarResults(carOffers) {
        return carOffers.map(offer => {
            return {
                id: offer.id,
                model: offer.carInfo?.model || offer.carInfo?.type || null,
                pickupLocation: offer.pickUpLocation || null,
                pickupDate: offer.pickUpDateTime || null,
                returnLocation: offer.dropOffLocation || null,
                returnDate: offer.dropOffDateTime || null,
                price: offer.price?.total || null,
                currency: offer.price?.currency || null,
                // Original structure for full details
                carType: offer.carInfo?.type,
                transmission: offer.carInfo?.transmission,
                airConditioning: offer.carInfo?.airConditioning,
                fuelPolicy: offer.carInfo?.fuelPolicy,
                seats: offer.carInfo?.seats,
                bags: offer.carInfo?.bags,
                vendor: offer.vendor?.name,
                location: {
                    pickUp: offer.pickUpLocation,
                    dropOff: offer.dropOffLocation
                },
                ...offer // preserve all original fields
            };
        });
    }

    // Airport/City Search
    async searchAirports(keyword) {
        try {
            const cacheKey = `airport_${keyword.toLowerCase()}`;
            
            // Check cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const response = await this.amadeus.referenceData.locations.get({
                keyword: keyword,
                subType: Amadeus.location.any
            });

            const airports = response.data.map(location => ({
                code: location.iataCode,
                name: location.name,
                city: location.address.cityName,
                country: location.address.countryName,
                type: location.subType
            }));

            // Cache the results
            await redisClient.set(cacheKey, JSON.stringify(airports), { EX: 3600 }); // 1 hour
            
            return airports;

        } catch (error) {
            logger.error(`Airport search error: ${error.message}`);
            throw new Error(`Failed to search airports: ${error.message}`);
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
            logger.error(`Flight price history error: ${error.message}`);
            throw new Error(`Failed to get flight price history: ${error.message}`);
        }
    }

    // Clear cache for specific searches
    async clearCache(type, params) {
        try {
            const keys = await redisClient.keys(`${type}_*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.info(`Cleared ${keys.length} ${type} cache entries`);
            }
        } catch (error) {
            logger.error(`Cache clear error: ${error.message}`);
        }
    }
}

module.exports = new AmadeusService(); 