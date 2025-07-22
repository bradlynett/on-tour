const { pool } = require('../config/database');
const redisClient = require('../redisClient');
const logger = require('../utils/logger');

class DataEnrichmentService {
    constructor() {
        this.priceHistoryCache = new Map();
        this.availabilityCache = new Map();
    }

    /**
     * Enrich component data with additional details from multiple sources
     */
    async enrichComponentData(componentId, componentType, baseData) {
        try {
            logger.info(`Enriching ${componentType} component ${componentId}`);

            const enrichedData = {
                ...baseData,
                dataSource: baseData.dataSource || 'unknown',
                lastUpdated: new Date().toISOString(),
                dataFreshness: new Date().toISOString()
            };

            // Add component-specific enrichment
            switch (componentType) {
                case 'flight':
                    enrichedData.details = await this.enrichFlightData(baseData);
                    break;
                case 'hotel':
                    enrichedData.details = await this.enrichHotelData(baseData);
                    break;
                case 'ticket':
                    enrichedData.details = await this.enrichTicketData(baseData);
                    break;
                case 'car':
                    enrichedData.details = await this.enrichCarData(baseData);
                    break;
            }

            // Update database with enriched data
            await this.updateComponentData(componentId, enrichedData);

            return enrichedData;
        } catch (error) {
            logger.error(`Failed to enrich component data: ${error.message}`);
            return baseData; // Return original data if enrichment fails
        }
    }

    /**
     * Enrich flight data with additional details
     */
    async enrichFlightData(flightData) {
        const enriched = { ...flightData };

        // Add seat map information
        if (enriched.aircraft?.code) {
            enriched.seatMap = await this.getSeatMapInfo(enriched.aircraft.code);
        }

        // Add real-time flight status
        if (enriched.flightNumber) {
            enriched.flightStatus = await this.getFlightStatus(enriched.flightNumber);
        }

        // Add baggage details
        enriched.baggage = await this.getBaggageDetails(enriched.airline_code, enriched.cabinClass);

        // Add meal information
        enriched.meals = await this.getMealInfo(enriched.airline_code, enriched.cabinClass, enriched.duration);

        return enriched;
    }

    /**
     * Enrich hotel data with additional details
     */
    async enrichHotelData(hotelData) {
        const enriched = { ...hotelData };

        // Add room photos
        if (enriched.name) {
            enriched.photos = await this.getHotelPhotos(enriched.name, enriched.location?.city);
        }

        // Add nearby attractions
        if (enriched.location) {
            enriched.nearbyAttractions = await this.getNearbyAttractions(
                enriched.location.latitude, 
                enriched.location.longitude
            );
        }

        // Add transportation options
        enriched.transportation = await this.getTransportationOptions(
            enriched.location?.city, 
            enriched.location?.address
        );

        // Add dining options
        enriched.dining = await this.getDiningOptions(
            enriched.location?.latitude, 
            enriched.location?.longitude
        );

        return enriched;
    }

    /**
     * Enrich ticket data with additional details
     */
    async enrichTicketData(ticketData) {
        const enriched = { ...ticketData };

        // Add venue seating chart
        if (enriched.location?.venue) {
            enriched.seatingChart = await this.getVenueSeatingChart(enriched.location.venue);
        }

        // Add view from seat information
        if (enriched.section && enriched.row && enriched.seat) {
            enriched.viewFromSeat = await this.getViewFromSeat(
                enriched.location?.venue, 
                enriched.section, 
                enriched.row, 
                enriched.seat
            );
        }

        // Add accessibility information
        enriched.accessibility = await this.getVenueAccessibility(enriched.location?.venue);

        // Add parking information
        enriched.parking = await this.getVenueParking(enriched.location?.venue);

        return enriched;
    }

    /**
     * Enrich car rental data with additional details
     */
    async enrichCarData(carData) {
        const enriched = { ...carData };

        // Add car photos
        if (enriched.carModel) {
            enriched.photos = await this.getCarPhotos(enriched.carModel, enriched.category);
        }

        // Add pickup/return location details
        if (enriched.pickupLocation) {
            enriched.pickupLocation.details = await this.getLocationDetails(enriched.pickupLocation);
        }

        if (enriched.returnLocation) {
            enriched.returnLocation.details = await this.getLocationDetails(enriched.returnLocation);
        }

        // Add insurance options
        enriched.insuranceOptions = await this.getInsuranceOptions(enriched.category);

        return enriched;
    }

    /**
     * Track price changes for components
     */
    async trackPriceChange(componentId, newPrice, currency = 'USD') {
        try {
            const cacheKey = `price_history_${componentId}`;
            const history = await redisClient.get(cacheKey);
            const priceHistory = history ? JSON.parse(history) : [];

            const priceEntry = {
                timestamp: new Date().toISOString(),
                price: newPrice,
                currency,
                source: 'real_time'
            };

            priceHistory.push(priceEntry);

            // Keep only last 30 days of price history
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const filteredHistory = priceHistory.filter(entry => 
                new Date(entry.timestamp) > thirtyDaysAgo
            );

            await redisClient.set(cacheKey, JSON.stringify(filteredHistory), { EX: 2592000 }); // 30 days

            // Check for significant price changes
            await this.checkPriceAlerts(componentId, priceHistory);

            return priceEntry;
        } catch (error) {
            logger.error(`Failed to track price change: ${error.message}`);
        }
    }

    /**
     * Check for significant price changes and send alerts
     */
    async checkPriceAlerts(componentId, priceHistory) {
        if (priceHistory.length < 2) return;

        const recent = priceHistory[priceHistory.length - 1];
        const previous = priceHistory[priceHistory.length - 2];

        const priceChange = ((recent.price - previous.price) / previous.price) * 100;

        // Alert for 10% or greater price change
        if (Math.abs(priceChange) >= 10) {
            await this.sendPriceAlert(componentId, priceChange, recent.price, previous.price);
        }
    }

    /**
     * Send price change alerts
     */
    async sendPriceAlert(componentId, changePercent, newPrice, oldPrice) {
        try {
            // Get component details
            const component = await this.getComponentById(componentId);
            if (!component) return;

            const alert = {
                componentId,
                componentType: component.component_type,
                changePercent: Math.round(changePercent * 100) / 100,
                newPrice,
                oldPrice,
                direction: changePercent > 0 ? 'increase' : 'decrease',
                timestamp: new Date().toISOString()
            };

            // Store alert in database
            await this.storePriceAlert(alert);

            // Send notification (implement based on your notification system)
            logger.info(`Price alert: ${alert.direction} of ${Math.abs(alert.changePercent)}% for ${component.component_type}`);

        } catch (error) {
            logger.error(`Failed to send price alert: ${error.message}`);
        }
    }

    /**
     * Monitor component availability
     */
    async monitorAvailability(componentId) {
        try {
            const component = await this.getComponentById(componentId);
            if (!component) return;

            const availability = await this.checkComponentAvailability(component);
            
            // Update availability cache
            const cacheKey = `availability_${componentId}`;
            await redisClient.set(cacheKey, JSON.stringify(availability), { EX: 3600 }); // 1 hour

            // Check for availability changes
            await this.checkAvailabilityAlerts(componentId, availability);

            return availability;
        } catch (error) {
            logger.error(`Failed to monitor availability: ${error.message}`);
        }
    }

    /**
     * Check component availability
     */
    async checkComponentAvailability(component) {
        // This would integrate with actual provider APIs
        // For now, return mock availability
        return {
            available: Math.random() > 0.1, // 90% chance of being available
            quantity: Math.floor(Math.random() * 10) + 1,
            lastChecked: new Date().toISOString(),
            nextCheck: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            waitlistAvailable: false
        };
    }

    /**
     * Update component data in database
     */
    async updateComponentData(componentId, enrichedData) {
        try {
            const query = `
                UPDATE trip_components 
                SET details = $1, last_updated = CURRENT_TIMESTAMP, data_freshness = CURRENT_TIMESTAMP
                WHERE id = $2
            `;
            
            await pool.query(query, [JSON.stringify(enrichedData), componentId]);
            logger.info(`Updated component ${componentId} with enriched data`);
        } catch (error) {
            logger.error(`Failed to update component data: ${error.message}`);
        }
    }

    /**
     * Get component by ID
     */
    async getComponentById(componentId) {
        try {
            const query = 'SELECT * FROM trip_components WHERE id = $1';
            const result = await pool.query(query, [componentId]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Failed to get component: ${error.message}`);
            return null;
        }
    }

    /**
     * Store price alert in database
     */
    async storePriceAlert(alert) {
        try {
            const query = `
                INSERT INTO price_alerts (component_id, change_percent, new_price, old_price, direction, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            await pool.query(query, [
                alert.componentId,
                alert.changePercent,
                alert.newPrice,
                alert.oldPrice,
                alert.direction,
                alert.timestamp
            ]);
        } catch (error) {
            logger.error(`Failed to store price alert: ${error.message}`);
        }
    }

    // Mock methods for data enrichment (replace with actual API calls)
    async getSeatMapInfo(aircraftCode) {
        return `https://seatguru.com/airlines/American_Airlines/American_Airlines_${aircraftCode}.php`;
    }

    async getFlightStatus(flightNumber) {
        return {
            status: 'On Time',
            departure: '10:00 AM',
            arrival: '1:30 PM',
            gate: 'A12'
        };
    }

    async getBaggageDetails(airlineCode, cabinClass) {
        return {
            checked: 1,
            carry_on: 1,
            personal_item: 1,
            weight_limit: '50 lbs',
            oversized_fees: '$150'
        };
    }

    async getMealInfo(airlineCode, cabinClass, duration) {
        return {
            service: cabinClass === 'economy' ? 'snack_service' : 'full_service',
            options: ['Chicken', 'Beef', 'Vegetarian'],
            special_meals: ['Kosher', 'Halal', 'Gluten-free']
        };
    }

    async getHotelPhotos(hotelName, city) {
        return [
            {
                url: `https://example.com/hotels/${hotelName.replace(/\s+/g, '-').toLowerCase()}/room1.jpg`,
                caption: 'Standard Room',
                category: 'room'
            }
        ];
    }

    async getNearbyAttractions(lat, lng) {
        return [
            { name: 'Downtown Area', distance: '0.5 miles' },
            { name: 'Shopping Center', distance: '1.2 miles' },
            { name: 'Restaurant District', distance: '0.8 miles' }
        ];
    }

    async getTransportationOptions(city, address) {
        return [
            'Public Transit',
            'Ride Share',
            'Taxi',
            'Rental Car',
            'Walking'
        ];
    }

    async getDiningOptions(lat, lng) {
        return [
            { name: 'Hotel Restaurant', type: 'Fine Dining', distance: '0 miles' },
            { name: 'Local Cafe', type: 'Casual', distance: '0.3 miles' },
            { name: 'Pizza Place', type: 'Quick Service', distance: '0.5 miles' }
        ];
    }

    async getVenueSeatingChart(venue) {
        return `https://example.com/venues/${venue.replace(/\s+/g, '-').toLowerCase()}/seating-chart`;
    }

    async getViewFromSeat(venue, section, row, seat) {
        return {
            description: 'Great view of the stage',
            distance: '50 feet from stage',
            angle: 'Center stage',
            obstructed: false
        };
    }

    async getVenueAccessibility(venue) {
        return [
            'Wheelchair accessible seating',
            'Accessible parking',
            'Assistive listening devices',
            'Service animals welcome'
        ];
    }

    async getVenueParking(venue) {
        return {
            available: true,
            cost: '$20',
            distance: '0.2 miles',
            accessible: true
        };
    }

    async getCarPhotos(carModel, category) {
        return [
            {
                url: `https://example.com/cars/${carModel.replace(/\s+/g, '-').toLowerCase()}/exterior.jpg`,
                caption: 'Exterior View',
                category: 'exterior'
            }
        ];
    }

    async getLocationDetails(location) {
        return {
            hours: '24/7',
            phone: '(555) 123-4567',
            services: ['Pickup', 'Return', 'Shuttle']
        };
    }

    async getInsuranceOptions(category) {
        return [
            { type: 'Basic', cost: '$15/day', coverage: 'Liability only' },
            { type: 'Standard', cost: '$25/day', coverage: 'Liability + Collision' },
            { type: 'Premium', cost: '$35/day', coverage: 'Full coverage' }
        ];
    }
}

module.exports = new DataEnrichmentService(); 