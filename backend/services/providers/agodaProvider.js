const { TravelProviderInterface, TravelResponseFormatter } = require('../travelProviderInterface');
const { redisClient } = require('../../redisClient');
const winston = require('winston');

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

class AgodaProvider extends TravelProviderInterface {
    constructor() {
        super();
        this.apiKey = process.env.AGODA_API_KEY || 'test'; // Use test key for now
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    getProviderName() {
        return 'agoda';
    }

    async isAvailable() {
        // For now, always return true if test key is present
        return !!this.apiKey;
    }

    async healthCheck() {
        return {
            provider: this.getProviderName(),
            status: (await this.isAvailable()) ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString()
        };
    }

    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        // Placeholder: return a mock hotel result for now
        logger.info(`Agoda: Returning mock hotel result for ${cityCode}`);
        return [
            {
                name: 'Test Agoda Hotel',
                checkIn: checkInDate,
                checkOut: checkOutDate,
                roomType: 'Deluxe',
                price: 179.99,
                provider: this.getProviderName(),
                cityCode,
                offers: [{ price: { total: 179.99, currency: 'USD' } }]
            }
        ];
    }
}

module.exports = AgodaProvider; 