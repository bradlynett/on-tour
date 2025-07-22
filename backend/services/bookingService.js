const { logger } = require('../utils/logger');
const { redisClient } = require('../redisClient');
const { pool } = require('../config/database');

class BookingService {
  constructor() {
    this.providers = {
      flights: ['skyscanner', 'amadeus', 'expedia'],
      hotels: ['booking', 'hotels', 'airbnb'],
      tickets: ['ticketmaster', 'eventbrite', 'stubhub'],
      transportation: ['uber', 'lyft', 'taxi'],
      cars: ['hertz', 'avis', 'enterprise']
    };
  }

  /**
   * Process a complete trip booking with multiple components
   */
  async processTripBooking(userId, tripSuggestionId, selections) {
    const bookingId = `TRIP-${tripSuggestionId}-${Date.now()}`;
    
    try {
      logger.info(`Starting trip booking process`, {
        bookingId,
        userId,
        tripSuggestionId,
        componentCount: selections.length
      });

      // Create trip_components records if they don't exist
      await this.createTripComponents(tripSuggestionId, selections);

      // Update trip suggestion with booking info
      await this.updateTripSuggestionBooking(tripSuggestionId, bookingId, 'processing');

      // Process each component in parallel
      const bookingPromises = selections.map(selection => 
        this.processComponentBooking(tripSuggestionId, selection)
      );

      const results = await Promise.allSettled(bookingPromises);
      
      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

      // Update booking status
      const overallStatus = failed.length === 0 ? 'confirmed' : 
                           successful.length === 0 ? 'failed' : 'partial';

      await this.updateTripSuggestionBooking(tripSuggestionId, bookingId, overallStatus, {
        successful,
        failed,
        totalComponents: selections.length,
        successfulComponents: successful.length
      });

      // Cache booking results
      await this.cacheBookingResults(bookingId, {
        status: overallStatus,
        components: successful,
        failed,
        totalCost: successful.reduce((sum, comp) => sum + comp.price, 0)
      });

      logger.info(`Trip booking process completed`, {
        bookingId,
        status: overallStatus,
        successful: successful.length,
        failed: failed.length
      });

      return {
        bookingId,
        status: overallStatus,
        components: successful,
        failed,
        totalCost: successful.reduce((sum, comp) => sum + comp.price, 0)
      };

    } catch (error) {
      logger.error(`Trip booking process failed`, {
        bookingId,
        userId,
        tripSuggestionId,
        error: error.message
      });

      await this.updateTripSuggestionBooking(tripSuggestionId, bookingId, 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Process booking for a single component
   */
  async processComponentBooking(tripSuggestionId, selection) {
    const componentId = `${tripSuggestionId}-${selection.componentType}`;
    
    try {
      logger.info(`Processing component booking`, {
        componentId,
        componentType: selection.componentType,
        provider: selection.selectedOption.provider
      });

      // Update component status to processing
      await this.updateComponentBookingStatus(tripSuggestionId, selection.componentType, 'processing');

      // Simulate provider-specific booking logic
      const result = await this.bookWithProvider(
        selection.componentType,
        selection.selectedOption,
        componentId
      );

      // Update component status to confirmed
      await this.updateComponentBookingStatus(tripSuggestionId, selection.componentType, 'confirmed', result);

      logger.info(`Component booking successful`, {
        componentId,
        bookingReference: result.bookingReference
      });

      return {
        componentType: selection.componentType,
        provider: selection.selectedOption.provider,
        price: selection.selectedOption.price,
        bookingReference: result.bookingReference,
        confirmationNumber: result.confirmationNumber,
        details: result.details,
        status: 'confirmed'
      };

    } catch (error) {
      logger.error(`Component booking failed`, {
        componentId,
        componentType: selection.componentType,
        error: error.message
      });

      await this.updateComponentBookingStatus(tripSuggestionId, selection.componentType, 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Book with specific provider
   */
  async bookWithProvider(componentType, option, componentId) {
    // Simulate different booking times for different providers
    const bookingDelay = Math.random() * 3000 + 1000; // 1-4 seconds
    
    await new Promise(resolve => setTimeout(resolve, bookingDelay));

    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Provider ${option.provider} is temporarily unavailable`);
    }

    // Generate booking details based on component type
    const bookingReference = `${option.provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const confirmationNumber = `CN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const details = this.generateBookingDetails(componentType, option);

    return {
      bookingReference,
      confirmationNumber,
      details,
      provider: option.provider,
      price: option.price
    };
  }

  /**
   * Generate booking details based on component type
   */
  generateBookingDetails(componentType, option) {
    const baseDetails = {
      provider: option.provider,
      bookingTime: new Date().toISOString(),
      cancellationPolicy: option.cancellationPolicy || 'Standard cancellation policy applies'
    };

    switch (componentType) {
      case 'flight':
        return {
          ...baseDetails,
          flightNumber: `FL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          departure: option.details?.departure || 'JFK',
          arrival: option.details?.arrival || 'LAX',
          departureTime: option.details?.departureTime || '10:00 AM',
          arrivalTime: option.details?.arrivalTime || '1:00 PM',
          seat: `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`,
          class: option.details?.class || 'Economy'
        };

      case 'hotel':
        return {
          ...baseDetails,
          hotelName: option.details?.name || 'Sample Hotel',
          roomType: option.details?.roomType || 'Standard Room',
          checkIn: option.details?.checkIn || '3:00 PM',
          checkOut: option.details?.checkOut || '11:00 AM',
          roomNumber: `${Math.floor(Math.random() * 10) + 1}${Math.floor(Math.random() * 100)}`
        };

      case 'ticket':
        return {
          ...baseDetails,
          ticketType: option.details?.ticketType || 'General Admission',
          section: option.details?.section || 'GA',
          row: option.details?.row || Math.floor(Math.random() * 50) + 1,
          seat: option.details?.seat || Math.floor(Math.random() * 20) + 1,
          delivery: option.details?.delivery || 'Mobile'
        };

      case 'car':
        return {
          ...baseDetails,
          carModel: option.details?.carModel || 'Toyota Camry',
          pickupLocation: option.details?.pickupLocation || 'Airport',
          returnLocation: option.details?.returnLocation || 'Airport',
          pickupDate: option.details?.pickupDate || new Date().toISOString(),
          returnDate: option.details?.returnDate || new Date(Date.now() + 86400000).toISOString()
        };

      case 'transportation':
        return {
          ...baseDetails,
          service: option.details?.service || 'Ride Share',
          pickup: option.details?.pickup || 'Hotel',
          dropoff: option.details?.dropoff || 'Venue',
          estimatedTime: option.details?.estimatedTime || '15 min'
        };

      default:
        return baseDetails;
    }
  }

  /**
   * Update trip suggestion with booking info
   */
  async updateTripSuggestionBooking(tripSuggestionId, bookingId, status, details = {}) {
    const query = `
      UPDATE trip_suggestions 
      SET booking_id = $1, booking_status = $2, booking_details = $3, 
          booking_updated_at = NOW()
      WHERE id = $4
    `;

    await pool.query(query, [
      bookingId,
      status,
      JSON.stringify(details),
      tripSuggestionId
    ]);
  }

  /**
   * Update component booking status
   */
  async updateComponentBookingStatus(tripSuggestionId, componentType, status, details = {}) {
    const query = `
      UPDATE trip_components 
      SET booking_status = $1, booking_details = $2, booking_updated_at = NOW()
      WHERE trip_suggestion_id = $3 AND component_type = $4
    `;

    await pool.query(query, [
      status,
      JSON.stringify(details),
      tripSuggestionId,
      componentType
    ]);
  }

  /**
   * Create trip_components records for the selections
   */
  async createTripComponents(tripSuggestionId, selections) {
    for (const selection of selections) {
      const query = `
        INSERT INTO trip_components (trip_suggestion_id, component_type, provider, price, details, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await pool.query(query, [
        tripSuggestionId,
        selection.componentType,
        selection.selectedOption.provider,
        selection.selectedOption.price,
        JSON.stringify(selection.selectedOption)
      ]);
    }
  }

  /**
   * Cache booking results
   */
  async cacheBookingResults(bookingId, results) {
    const cacheKey = `booking:${bookingId}`;
    await redisClient.set(cacheKey, JSON.stringify(results), { EX: 3600 }); // Cache for 1 hour
  }

  /**
   * Get booking status
   */
  async getBookingStatus(bookingId) {
    // Try cache first
    const cacheKey = `booking:${bookingId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      const cachedResult = JSON.parse(cached);
      // Ensure cached result has userId for ownership verification
      if (!cachedResult.userId) {
        // If cached result doesn't have userId, fetch from database
        const dbResult = await this.getBookingStatusFromDatabase(bookingId);
        // Update cache with complete data
        await this.cacheBookingResults(bookingId, dbResult);
        return dbResult;
      }
      return cachedResult;
    }

    return await this.getBookingStatusFromDatabase(bookingId);
  }

  /**
   * Get booking status from database
   */
  async getBookingStatusFromDatabase(bookingId) {
    // Query database using existing trip_suggestions table
    const query = `
      SELECT ts.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'component_type', tc.component_type,
                   'provider', tc.provider,
                   'price', tc.price,
                   'booking_status', tc.booking_status,
                   'booking_details', tc.booking_details
                 )
               ) FILTER (WHERE tc.id IS NOT NULL), '[]'
             ) as components
      FROM trip_suggestions ts
      LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
      WHERE ts.booking_id = $1
      GROUP BY ts.id
    `;

    const result = await pool.query(query, [bookingId]);
    
    if (result.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = result.rows[0];
    const components = booking.components || [];

    const bookingResult = {
      bookingId: booking.booking_id,
      userId: booking.user_id,
      status: booking.booking_status,
      totalCost: components.reduce((sum, comp) => sum + (comp.price || 0), 0),
      components: components.filter(comp => comp.booking_status === 'confirmed'),
      failed: components.filter(comp => comp.booking_status === 'failed'),
      createdAt: booking.booking_created_at,
      updatedAt: booking.booking_updated_at
    };

    // Cache the result
    await this.cacheBookingResults(bookingId, bookingResult);

    return bookingResult;
  }

  /**
   * Get user's booking history
   */
  async getUserBookings(userId, limit = 10, offset = 0) {
    const query = `
      SELECT ts.*, 
             COUNT(tc.id) as component_count,
             SUM(CASE WHEN tc.booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_components
      FROM trip_suggestions ts
      LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
      WHERE ts.user_id = $1
      GROUP BY ts.id
      ORDER BY ts.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId, userId) {
    // Verify ownership
    const ownershipQuery = 'SELECT user_id, id FROM trip_suggestions WHERE booking_id = $1';
    const ownershipResult = await pool.query(ownershipQuery, [bookingId]);
    
    if (ownershipResult.rows.length === 0 || ownershipResult.rows[0].user_id !== userId) {
      throw new Error('Booking not found or access denied');
    }

    const tripSuggestionId = ownershipResult.rows[0].id;

    // Update status
    await this.updateTripSuggestionBooking(tripSuggestionId, bookingId, 'cancelled', {
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId
    });

    // Cancel individual components
    const componentQuery = `
      UPDATE trip_components 
      SET booking_status = 'cancelled', booking_updated_at = NOW()
      WHERE trip_suggestion_id = $1
    `;

    await pool.query(componentQuery, [tripSuggestionId]);

    logger.info(`Booking cancelled`, { bookingId, userId });

    return { bookingId, status: 'cancelled' };
  }

  /**
   * Get booking analytics
   */
  async getBookingAnalytics(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as successful_bookings,
        SUM(CASE WHEN booking_status = 'failed' THEN 1 ELSE 0 END) as failed_bookings,
        SUM(CASE WHEN booking_status = 'partial' THEN 1 ELSE 0 END) as partial_bookings,
        AVG(component_count) as avg_components_per_booking
      FROM (
        SELECT ts.booking_status, COUNT(tc.id) as component_count
        FROM trip_suggestions ts
        LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
        WHERE ts.user_id = $1
        GROUP BY ts.id, ts.booking_status
      ) as booking_stats
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || {
      total_bookings: 0,
      successful_bookings: 0,
      failed_bookings: 0,
      partial_bookings: 0,
      avg_components_per_booking: 0
    };
  }
}

module.exports = new BookingService(); 