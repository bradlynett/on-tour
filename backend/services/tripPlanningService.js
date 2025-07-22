const { pool } = require('../config/database');
const unifiedTravelService = require('./unifiedTravelService');
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

class TripPlanningService {
    constructor() {
        this.serviceFeeRate = 0.05; // 5% service fee
        this.minServiceFee = 25; // $25 minimum
    }

    // Create a new trip plan
    async createTripPlan(userId, tripData) {
        try {
            logger.info(`Creating trip plan for user ${userId}`);

            const {
                name,
                description,
                eventId,
                startDate,
                endDate,
                travelers,
                budget,
                preferences
            } = tripData;

            // Validate required fields
            if (!name || !startDate || !endDate) {
                throw new Error('Trip name, start date, and end date are required');
            }

            // Insert trip plan
            const tripResult = await pool.query(`
                INSERT INTO trip_plans (
                    user_id, name, description, event_id, start_date, end_date, 
                    travelers, budget, preferences, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                RETURNING id
            `, [
                userId, name, description, eventId, startDate, endDate,
                JSON.stringify(travelers), budget, JSON.stringify(preferences),
                'planning'
            ]);

            const tripPlanId = tripResult.rows[0].id;

            logger.info(`Created trip plan ${tripPlanId} for user ${userId}`);
            return { tripPlanId, success: true };

        } catch (error) {
            logger.error(`Failed to create trip plan: ${error.message}`);
            throw new Error(`Failed to create trip plan: ${error.message}`);
        }
    }

    // Get user's trip plans
    async getUserTripPlans(userId, status = null) {
        try {
            logger.info(`Getting trip plans for user ${userId}`);

            let query = `
                SELECT 
                    tp.id, tp.name, tp.description, tp.event_id, tp.start_date, tp.end_date,
                    tp.travelers, tp.budget, tp.preferences, tp.status, tp.created_at,
                    e.name as event_name, e.artist, e.venue_name, e.venue_city, e.event_date
                FROM trip_plans tp
                LEFT JOIN events e ON tp.event_id = e.id
                WHERE tp.user_id = $1
            `;
            const params = [userId];

            if (status) {
                query += ` AND tp.status = $2`;
                params.push(status);
            }

            query += ` ORDER BY tp.created_at DESC`;

            const result = await pool.query(query, params);

            logger.info(`Found ${result.rows.length} trip plans for user ${userId}`);
            return result.rows;

        } catch (error) {
            logger.error(`Failed to get trip plans: ${error.message}`);
            throw new Error(`Failed to get trip plans: ${error.message}`);
        }
    }

    // Get trip plan details
    async getTripPlanDetails(tripPlanId, userId) {
        try {
            logger.info(`Getting trip plan details for ${tripPlanId}`);

            const result = await pool.query(`
                SELECT 
                    tp.*, e.name as event_name, e.artist, e.venue_name, e.venue_city, e.event_date
                FROM trip_plans tp
                LEFT JOIN events e ON tp.event_id = e.id
                WHERE tp.id = $1 AND tp.user_id = $2
            `, [tripPlanId, userId]);

            if (result.rows.length === 0) {
                throw new Error('Trip plan not found');
            }

            const tripPlan = result.rows[0];

            // Get trip components (flights, hotels, cars)
            const components = await this.getTripComponents(tripPlanId);

            return {
                ...tripPlan,
                components,
                totalCost: this.calculateTotalCost(components),
                serviceFee: this.calculateServiceFee(this.calculateTotalCost(components))
            };

        } catch (error) {
            logger.error(`Failed to get trip plan details: ${error.message}`);
            throw new Error(`Failed to get trip plan details: ${error.message}`);
        }
    }

    // Update trip plan
    async updateTripPlan(tripPlanId, userId, updates) {
        try {
            logger.info(`Updating trip plan ${tripPlanId}`);

            const allowedFields = ['name', 'description', 'start_date', 'end_date', 'travelers', 'budget', 'preferences'];
            const updateFields = [];
            const values = [];
            let paramCount = 1;

            for (const [field, value] of Object.entries(updates)) {
                if (allowedFields.includes(field)) {
                    updateFields.push(`${field} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(tripPlanId, userId);
            const query = `
                UPDATE trip_plans 
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
                RETURNING id
            `;

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Trip plan not found or access denied');
            }

            logger.info(`Updated trip plan ${tripPlanId}`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to update trip plan: ${error.message}`);
            throw new Error(`Failed to update trip plan: ${error.message}`);
        }
    }

    // Add component to trip plan
    async addTripComponent(tripPlanId, userId, componentData) {
        try {
            logger.info(`Adding component to trip plan ${tripPlanId}`);

            const {
                type, // 'flight', 'hotel', 'car', 'activity'
                provider,
                providerId,
                details,
                price,
                bookingReference = null
            } = componentData;

            // Validate trip plan ownership
            const tripCheck = await pool.query(`
                SELECT id FROM trip_plans WHERE id = $1 AND user_id = $2
            `, [tripPlanId, userId]);

            if (tripCheck.rows.length === 0) {
                throw new Error('Trip plan not found or access denied');
            }

            // Insert component
            const result = await pool.query(`
                INSERT INTO trip_components (
                    trip_plan_id, type, provider, provider_id, details, price, 
                    booking_reference, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id
            `, [
                tripPlanId, type, provider, providerId, JSON.stringify(details),
                price, bookingReference, 'pending'
            ]);

            logger.info(`Added ${type} component to trip plan ${tripPlanId}`);
            return { componentId: result.rows[0].id, success: true };

        } catch (error) {
            logger.error(`Failed to add trip component: ${error.message}`);
            throw new Error(`Failed to add trip component: ${error.message}`);
        }
    }

    // Get trip components
    async getTripComponents(tripPlanId) {
        try {
            const result = await pool.query(`
                SELECT * FROM trip_components 
                WHERE trip_plan_id = $1 
                ORDER BY type, created_at
            `, [tripPlanId]);

            return result.rows;

        } catch (error) {
            logger.error(`Failed to get trip components: ${error.message}`);
            throw new Error(`Failed to get trip components: ${error.message}`);
        }
    }

    // Remove component from trip plan
    async removeTripComponent(componentId, userId) {
        try {
            logger.info(`Removing component ${componentId}`);

            // Verify ownership through trip plan
            const result = await pool.query(`
                DELETE FROM trip_components 
                WHERE id = $1 AND trip_plan_id IN (
                    SELECT id FROM trip_plans WHERE user_id = $2
                )
                RETURNING id
            `, [componentId, userId]);

            if (result.rows.length === 0) {
                throw new Error('Component not found or access denied');
            }

            logger.info(`Removed component ${componentId}`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to remove trip component: ${error.message}`);
            throw new Error(`Failed to remove trip component: ${error.message}`);
        }
    }

    // Search and add travel options to trip
    async searchAndAddTravelOption(tripPlanId, userId, searchParams) {
        try {
            logger.info(`Searching travel options for trip ${tripPlanId}`);

            const { type, origin, destination, dates, passengers, preferences } = searchParams;

            let searchResults = [];

            switch (type) {
                case 'flight':
                    searchResults = await unifiedTravelService.searchFlights(
                        origin, destination, dates.departure, dates.return, passengers
                    );
                    break;
                case 'hotel':
                    searchResults = await unifiedTravelService.searchHotels(
                        destination, dates.checkIn, dates.checkOut, passengers
                    );
                    break;
                case 'car':
                    searchResults = await unifiedTravelService.searchCarRentals(
                        origin, destination, dates.pickUp, dates.dropOff
                    );
                    break;
                default:
                    throw new Error(`Unsupported travel type: ${type}`);
            }

            return {
                type,
                results: searchResults,
                searchParams
            };

        } catch (error) {
            logger.error(`Failed to search travel options: ${error.message}`);
            throw new Error(`Failed to search travel options: ${error.message}`);
        }
    }

    // Calculate total cost
    calculateTotalCost(components) {
        return components.reduce((total, component) => {
            let price = component.price;
            if (typeof price === 'string') price = parseFloat(price);
            return total + (price || 0);
        }, 0);
    }

    // Calculate service fee
    calculateServiceFee(totalCost) {
        const fee = totalCost * this.serviceFeeRate;
        return Math.max(fee, this.minServiceFee);
    }

    // Get trip recommendations based on event
    async getTripRecommendations(eventId, userId) {
        try {
            logger.info(`Getting trip recommendations for event ${eventId}`);

            // Get event details
            const eventResult = await pool.query(`
                SELECT * FROM events WHERE id = $1
            `, [eventId]);

            if (eventResult.rows.length === 0) {
                throw new Error('Event not found');
            }

            const event = eventResult.rows[0];

            // Get user preferences
            const userResult = await pool.query(`
                SELECT * FROM travel_preferences WHERE user_id = $1
            `, [userId]);

            const preferences = userResult.rows[0] || {};

            // Generate recommendations
            const recommendations = {
                event: event,
                flights: await this.getFlightRecommendations(event, preferences),
                hotels: await this.getHotelRecommendations(event, preferences),
                activities: await this.getActivityRecommendations(event, preferences)
            };

            return recommendations;

        } catch (error) {
            logger.error(`Failed to get trip recommendations: ${error.message}`);
            throw new Error(`Failed to get trip recommendations: ${error.message}`);
        }
    }

    // Get flight recommendations
    async getFlightRecommendations(event, preferences) {
        try {
            const origin = preferences.primary_airport || 'LAX';
            const destination = this.getNearestAirport(event.venue_city);
            
            if (!destination) {
                return [];
            }

            const eventDate = new Date(event.event_date);
            const departureDate = new Date(eventDate);
            departureDate.setDate(departureDate.getDate() - 1);

            const returnDate = new Date(eventDate);
            returnDate.setDate(returnDate.getDate() + 1);

            const flights = await unifiedTravelService.searchFlights(
                origin, destination, 
                departureDate.toISOString().split('T')[0],
                returnDate.toISOString().split('T')[0],
                1, 5
            );

            return flights.flights || [];

        } catch (error) {
            logger.error(`Failed to get flight recommendations: ${error.message}`);
            return [];
        }
    }

    // Get hotel recommendations
    async getHotelRecommendations(event, preferences) {
        try {
            const cityCode = this.getCityCode(event.venue_city);
            
            if (!cityCode) {
                return [];
            }

            const eventDate = new Date(event.event_date);
            const checkIn = new Date(eventDate);
            checkIn.setDate(checkIn.getDate() - 1);

            const checkOut = new Date(eventDate);
            checkOut.setDate(checkOut.getDate() + 1);

            const hotels = await unifiedTravelService.searchHotels(
                cityCode,
                checkIn.toISOString().split('T')[0],
                checkOut.toISOString().split('T')[0],
                1, 5, 5
            );

            return hotels.hotels || [];

        } catch (error) {
            logger.error(`Failed to get hotel recommendations: ${error.message}`);
            return [];
        }
    }

    // Get activity recommendations
    async getActivityRecommendations(event, preferences) {
        // Mock activity recommendations for now
        return [
            {
                id: 'activity_1',
                name: 'City Tour',
                description: 'Explore the city before the concert',
                price: 50,
                duration: '3 hours',
                type: 'sightseeing'
            },
            {
                id: 'activity_2',
                name: 'Dinner at Local Restaurant',
                description: 'Enjoy local cuisine',
                price: 75,
                duration: '2 hours',
                type: 'dining'
            }
        ];
    }

    // Helper methods
    getNearestAirport(city) {
        const airportMap = {
            'New York': 'JFK',
            'Los Angeles': 'LAX',
            'Chicago': 'ORD',
            'Houston': 'IAH',
            'Phoenix': 'PHX',
            'Philadelphia': 'PHL',
            'San Antonio': 'SAT',
            'San Diego': 'SAN',
            'Dallas': 'DFW',
            'San Jose': 'SJC'
        };
        return airportMap[city] || 'LAX';
    }

    getCityCode(city) {
        const cityMap = {
            'New York': 'NYC',
            'Los Angeles': 'LAX',
            'Chicago': 'CHI',
            'Houston': 'HOU',
            'Phoenix': 'PHX',
            'Philadelphia': 'PHL',
            'San Antonio': 'SAT',
            'San Diego': 'SAN',
            'Dallas': 'DFW',
            'San Jose': 'SJC'
        };
        return cityMap[city] || null;
    }
}

module.exports = new TripPlanningService(); 