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

const AmadeusTransferService = {
    // Search for transfers (shuttles, private cars, etc.) for a city or airport
    async searchTransfers(originLocationCode, destinationLocationCode, pickUpDate, pickUpTime, passengers = 1, maxResults = 10) {
        try {
            logger.info(`Amadeus: Searching transfers from ${originLocationCode} to ${destinationLocationCode} on ${pickUpDate} at ${pickUpTime}`);
            const response = await amadeus.shopping.transferOffers.get({
                originLocationCode,
                destinationLocationCode,
                pickUpDate,
                pickUpTime,
                passengers,
                currency: 'USD',
                max: maxResults
            });
            if (!response.data) {
                logger.warn('Amadeus: No transfer data returned');
                return [];
            }
            // Normalize results
            const transfers = response.data.map((transfer, idx) => ({
                id: transfer.id || `amadeus_transfer_${idx}_${Date.now()}`,
                provider: transfer.provider?.companyName || 'Unknown Provider',
                vehicleType: transfer.vehicle?.category || null,
                price: transfer.price?.total ? parseFloat(transfer.price.total) : null,
                currency: transfer.price?.currency || 'USD',
                pickUpLocation: transfer.origin?.locationCode || originLocationCode,
                dropOffLocation: transfer.destination?.locationCode || destinationLocationCode,
                pickUpDate: pickUpDate,
                pickUpTime: pickUpTime,
                passengers: passengers,
                bookingUrl: transfer.bookingUrl || null,
                dataSource: 'amadeus',
                details: transfer
            }));
            logger.info(`Amadeus: Found ${transfers.length} transfers from ${originLocationCode} to ${destinationLocationCode}`);
            return transfers;
        } catch (error) {
            logger.error(`Amadeus transfer search error: ${error.message}`);
            return [];
        }
    }
};

module.exports = AmadeusTransferService; 