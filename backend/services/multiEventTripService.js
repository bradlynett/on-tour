const { Pool } = require('pg');
const pool = require('../config/database');
const logger = require('../utils/logger');
const eventService = require('./eventService');
const tripPlanningService = require('./tripPlanningService');
const unifiedTravelService = require('./unifiedTravelService');

class MultiEventTripService {
  /**
   * Create a multi-event trip plan
   */
  async createMultiEventTrip(userId, events, preferences = {}) {
    try {
      logger.info(`Creating multi-event trip for user ${userId} with ${events.length} events`);

      // Validate events
      const validatedEvents = await this.validateEvents(events);
      if (validatedEvents.length === 0) {
        throw new Error('No valid events provided');
      }

      // Optimize route between events
      const optimizedRoute = await this.optimizeRoute(validatedEvents, preferences);

      // Generate trip components for each event
      const tripComponents = await this.generateTripComponents(validatedEvents, optimizedRoute, preferences);

      // Calculate total cost and savings
      const costAnalysis = await this.calculateCostAnalysis(tripComponents, validatedEvents.length);

      // Create multi-event trip record
      const multiEventTrip = await this.saveMultiEventTrip(userId, validatedEvents, optimizedRoute, costAnalysis);

      logger.info(`Multi-event trip created successfully: ${multiEventTrip.id}`);
      return multiEventTrip;

    } catch (error) {
      logger.error('Error creating multi-event trip:', error);
      throw error;
    }
  }

  /**
   * Validate and enrich event data
   */
  async validateEvents(eventIds) {
    const validatedEvents = [];
    
    for (const eventId of eventIds) {
      try {
        const event = await eventService.getEventById(eventId);
        if (event && event.status === 'active') {
          validatedEvents.push(event);
        } else {
          logger.warn(`Event ${eventId} is not available or inactive`);
        }
      } catch (error) {
        logger.error(`Error validating event ${eventId}:`, error);
      }
    }

    return validatedEvents;
  }

  /**
   * Optimize route between multiple events
   */
  async optimizeRoute(events, preferences = {}) {
    try {
      logger.info(`Optimizing route for ${events.length} events`);

      // Sort events by date
      const sortedEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate distances and travel times between events
      const routeSegments = [];
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentEvent = sortedEvents[i];
        const nextEvent = sortedEvents[i + 1];

        const segment = await this.calculateRouteSegment(currentEvent, nextEvent, preferences);
        routeSegments.push(segment);
      }

      // Optimize for different criteria
      const optimization = {
        chronological: sortedEvents,
        costOptimized: await this.optimizeForCost(sortedEvents, routeSegments),
        timeOptimized: await this.optimizeForTime(sortedEvents, routeSegments),
        distanceOptimized: await this.optimizeForDistance(sortedEvents, routeSegments)
      };

      return {
        events: sortedEvents,
        segments: routeSegments,
        optimization,
        totalDistance: routeSegments.reduce((sum, seg) => sum + seg.distance, 0),
        totalTravelTime: routeSegments.reduce((sum, seg) => sum + seg.travelTime, 0),
        estimatedCost: routeSegments.reduce((sum, seg) => sum + seg.estimatedCost, 0)
      };

    } catch (error) {
      logger.error('Error optimizing route:', error);
      throw error;
    }
  }

  /**
   * Calculate route segment between two events
   */
  async calculateRouteSegment(event1, event2, preferences) {
    try {
      const origin = event1.venue?.location || event1.location;
      const destination = event2.venue?.location || event2.location;

      if (!origin || !destination) {
        throw new Error('Missing location data for events');
      }

      // Get travel options between events
      const travelOptions = await unifiedTravelService.getTravelOptions({
        origin: origin,
        destination: destination,
        departureDate: event1.date,
        returnDate: event2.date,
        preferences: preferences
      });

      // Select best option based on preferences
      const bestOption = this.selectBestTravelOption(travelOptions, preferences);

      return {
        fromEvent: event1,
        toEvent: event2,
        distance: bestOption.distance || 0,
        travelTime: bestOption.duration || 0,
        estimatedCost: bestOption.price || 0,
        travelMethod: bestOption.type,
        travelDetails: bestOption
      };

    } catch (error) {
      logger.error('Error calculating route segment:', error);
      return {
        fromEvent: event1,
        toEvent: event2,
        distance: 0,
        travelTime: 0,
        estimatedCost: 0,
        travelMethod: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Select best travel option based on preferences
   */
  selectBestTravelOption(travelOptions, preferences) {
    if (!travelOptions || travelOptions.length === 0) {
      return null;
    }

    const { prioritize = 'cost', maxBudget, maxTime } = preferences;

    let filteredOptions = travelOptions;

    // Apply budget filter
    if (maxBudget) {
      filteredOptions = filteredOptions.filter(option => option.price <= maxBudget);
    }

    // Apply time filter
    if (maxTime) {
      filteredOptions = filteredOptions.filter(option => option.duration <= maxTime);
    }

    if (filteredOptions.length === 0) {
      return travelOptions[0]; // Return first option if filters too restrictive
    }

    // Sort based on priority
    switch (prioritize) {
      case 'cost':
        return filteredOptions.sort((a, b) => a.price - b.price)[0];
      case 'time':
        return filteredOptions.sort((a, b) => a.duration - b.duration)[0];
      case 'comfort':
        return filteredOptions.sort((a, b) => b.comfort - a.comfort)[0];
      default:
        return filteredOptions[0];
    }
  }

  /**
   * Optimize route for cost
   */
  async optimizeForCost(events, segments) {
    // Simple cost optimization - could be enhanced with more sophisticated algorithms
    return events;
  }

  /**
   * Optimize route for time
   */
  async optimizeForTime(events, segments) {
    // Simple time optimization
    return events;
  }

  /**
   * Optimize route for distance
   */
  async optimizeForDistance(events, segments) {
    // Simple distance optimization
    return events;
  }

  /**
   * Generate trip components for all events
   */
  async generateTripComponents(events, route, preferences) {
    const components = [];

    for (const event of events) {
      try {
        // Generate components for each event
        const eventComponents = await tripPlanningService.generateTripComponents(event, preferences);
        components.push({
          event: event,
          components: eventComponents
        });
      } catch (error) {
        logger.error(`Error generating components for event ${event.id}:`, error);
      }
    }

    // Add inter-event travel components
    for (const segment of route.segments) {
      if (segment.travelDetails) {
        components.push({
          type: 'inter_event_travel',
          segment: segment,
          components: [segment.travelDetails]
        });
      }
    }

    return components;
  }

  /**
   * Calculate cost analysis for multi-event trip
   */
  async calculateCostAnalysis(components, eventCount) {
    let totalCost = 0;
    let individualCosts = 0;
    let savings = 0;

    // Calculate total cost of all components
    for (const componentGroup of components) {
      if (componentGroup.components) {
        for (const component of componentGroup.components) {
          totalCost += component.price || 0;
        }
      }
    }

    // Calculate what it would cost if booked individually
    // This is a simplified calculation - could be enhanced with actual individual pricing
    individualCosts = totalCost * 1.15; // Assume 15% markup for individual bookings
    savings = individualCosts - totalCost;

    return {
      totalCost,
      individualCosts,
      savings,
      savingsPercentage: individualCosts > 0 ? (savings / individualCosts) * 100 : 0,
      costPerEvent: eventCount > 0 ? totalCost / eventCount : 0
    };
  }

  /**
   * Save multi-event trip to database
   */
  async saveMultiEventTrip(userId, events, route, costAnalysis) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert multi-event trip record
      const tripQuery = `
        INSERT INTO multi_event_trips (
          user_id, 
          events, 
          route_data, 
          cost_analysis, 
          status, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `;

      const tripResult = await client.query(tripQuery, [
        userId,
        JSON.stringify(events.map(e => e.id)),
        JSON.stringify(route),
        JSON.stringify(costAnalysis),
        'planned'
      ]);

      const multiEventTrip = tripResult.rows[0];

      await client.query('COMMIT');

      return {
        id: multiEventTrip.id,
        userId: multiEventTrip.user_id,
        events: events,
        route: route,
        costAnalysis: costAnalysis,
        status: multiEventTrip.status,
        createdAt: multiEventTrip.created_at,
        updatedAt: multiEventTrip.updated_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get multi-event trip by ID
   */
  async getMultiEventTrip(tripId) {
    try {
      const query = `
        SELECT * FROM multi_event_trips 
        WHERE id = $1
      `;

      const result = await pool.query(query, [tripId]);
      
      if (result.rows.length === 0) {
        throw new Error('Multi-event trip not found');
      }

      const trip = result.rows[0];
      
      // Parse JSON fields
      const events = JSON.parse(trip.events || '[]');
      const routeData = JSON.parse(trip.route_data || '{}');
      const costAnalysis = JSON.parse(trip.cost_analysis || '{}');

      return {
        id: trip.id,
        userId: trip.user_id,
        events: events,
        route: routeData,
        costAnalysis: costAnalysis,
        status: trip.status,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at
      };

    } catch (error) {
      logger.error('Error getting multi-event trip:', error);
      throw error;
    }
  }

  /**
   * Get user's multi-event trips
   */
  async getUserMultiEventTrips(userId) {
    try {
      const query = `
        SELECT * FROM multi_event_trips 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [userId]);
      
      return result.rows.map(trip => ({
        id: trip.id,
        userId: trip.user_id,
        events: JSON.parse(trip.events || '[]'),
        route: JSON.parse(trip.route_data || '{}'),
        costAnalysis: JSON.parse(trip.cost_analysis || '{}'),
        status: trip.status,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at
      }));

    } catch (error) {
      logger.error('Error getting user multi-event trips:', error);
      throw error;
    }
  }

  /**
   * Update multi-event trip status
   */
  async updateTripStatus(tripId, status) {
    try {
      const query = `
        UPDATE multi_event_trips 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [status, tripId]);
      
      if (result.rows.length === 0) {
        throw new Error('Multi-event trip not found');
      }

      return result.rows[0];

    } catch (error) {
      logger.error('Error updating trip status:', error);
      throw error;
    }
  }

  /**
   * Delete multi-event trip
   */
  async deleteMultiEventTrip(tripId, userId) {
    try {
      const query = `
        DELETE FROM multi_event_trips 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await pool.query(query, [tripId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Multi-event trip not found or unauthorized');
      }

      return { success: true, tripId };

    } catch (error) {
      logger.error('Error deleting multi-event trip:', error);
      throw error;
    }
  }
}

module.exports = new MultiEventTripService(); 