const Amadeus = require('amadeus');
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

const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

const AmadeusHotelService = {
    // Search for hotels in a city (by IATA code or city name)
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        try {
            logger.info(`Amadeus: Searching hotels in ${cityCode} from ${checkInDate} to ${checkOutDate}`);
            const response = await amadeus.shopping.hotelOffers.get({
                cityCode: cityCode,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                adults: adults,
                radius: radius,
                radiusUnit: 'KM',
                max: maxResults,
                currency: 'USD'
            });
            if (!response.data) {
                logger.warn('Amadeus: No hotel data returned');
                return [];
            }
            // Normalize results
            const hotels = response.data.map((hotel, idx) => ({
                id: hotel.hotel?.hotelId || `amadeus_hotel_${idx}_${Date.now()}`,
                name: hotel.hotel?.name || 'Unknown Hotel',
                address: hotel.hotel?.address?.lines?.join(', ') || null,
                city: hotel.hotel?.cityCode || null,
                latitude: hotel.hotel?.latitude || null,
                longitude: hotel.hotel?.longitude || null,
                rating: hotel.hotel?.rating ? parseFloat(hotel.hotel.rating) : null,
                amenities: hotel.hotel?.amenities || [],
                price: hotel.offers?.[0]?.price?.total ? parseFloat(hotel.offers[0].price.total) : null,
                currency: hotel.offers?.[0]?.price?.currency || 'USD',
                bookingUrl: hotel.offers?.[0]?.urls?.[0] || null,
                offers: hotel.offers || [],
                dataSource: 'amadeus',
                checkInDate: checkInDate,
                checkOutDate: checkOutDate
            }));
            logger.info(`Amadeus: Found ${hotels.length} hotels in ${cityCode}`);
            return hotels;
        } catch (error) {
            logger.error(`Amadeus hotel search error: ${error.message}`);
            return [];
        }
    },

    // Get hotel details by hotelId
    async getHotelDetails(hotelId) {
        try {
            logger.info(`Amadeus: Getting hotel details for ${hotelId}`);
            const response = await amadeus.referenceData.locations.hotels.byHotelId.get({ hotelId });
            if (!response.data) {
                logger.warn('Amadeus: No hotel details returned');
                return null;
            }
            return response.data;
        } catch (error) {
            logger.error(`Amadeus get hotel details error: ${error.message}`);
            return null;
        }
    }
};

module.exports = AmadeusHotelService; 