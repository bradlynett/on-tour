const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { authenticateToken } = require('../middleware/auth');
const { validateBookingRequest } = require('../middleware/validation');
const { logger } = require('../utils/logger');
const { pool } = require('../config/database');
const tripSuggestionEngine = require('../services/tripSuggestionEngine');

/**
 * @route POST /api/booking/trip-suggestion/:tripSuggestionId
 * @desc Book a trip suggestion with multiple components
 * @access Private
 */
router.post('/trip-suggestion/:tripSuggestionId', authenticateToken, validateBookingRequest, async (req, res) => {
  try {
    const { tripSuggestionId } = req.params;
    const { selections } = req.body;
    const userId = req.user.id;

    logger.info('Trip suggestion booking request received', {
      userId,
      tripSuggestionId,
      componentCount: selections.length
    });

    // Process the booking
    const result = await bookingService.processTripBooking(userId, tripSuggestionId, selections);

    // Send immediate response with booking ID
    res.status(200).json({
      success: true,
      message: 'Booking process initiated successfully',
      data: {
        bookingId: result.bookingId,
        status: result.status,
        estimatedCompletion: '2-5 minutes',
        components: result.components.length,
        totalCost: result.totalCost
      }
    });

  } catch (error) {
    logger.error('Trip suggestion booking failed', {
      userId: req.user.id,
      tripSuggestionId: req.params.tripSuggestionId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Booking process failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/booking/status/:bookingId
 * @desc Get booking status and details
 * @access Private
 */
router.get('/status/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await bookingService.getBookingStatus(bookingId);

    // Verify ownership
    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });

  } catch (error) {
    logger.error('Get booking status failed', {
      bookingId: req.params.bookingId,
      userId: req.user.id,
      error: error.message
    });

    res.status(404).json({
      success: false,
      message: 'Booking not found',
      error: error.message
    });
  }
});

/**
 * @route GET /api/booking/history
 * @desc Get user's booking history
 * @access Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const bookings = await bookingService.getUserBookings(userId, parseInt(limit), parseInt(offset));

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: bookings.length
        }
      }
    });

  } catch (error) {
    logger.error('Get booking history failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking history',
      error: error.message
    });
  }
});

/**
 * @route POST /api/booking/:bookingId/cancel
 * @desc Cancel a booking
 * @access Private
 */
router.post('/:bookingId/cancel', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const result = await bookingService.cancelBooking(bookingId, userId);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: result
    });

  } catch (error) {
    logger.error('Cancel booking failed', {
      bookingId: req.params.bookingId,
      userId: req.user.id,
      error: error.message
    });

    res.status(400).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

/**
 * @route GET /api/booking/analytics
 * @desc Get booking analytics for user
 * @access Private
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const analytics = await bookingService.getBookingAnalytics(userId);

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Get booking analytics failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking analytics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/booking/:bookingId/receipt
 * @desc Get booking receipt
 * @access Private
 */
router.get('/:bookingId/receipt', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await bookingService.getBookingStatus(bookingId);

    // Verify ownership
    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate receipt data
    const receipt = {
      bookingId: booking.bookingId,
      bookingDate: booking.createdAt,
      totalAmount: booking.totalCost,
      components: booking.components.map(comp => ({
        type: comp.componentType,
        provider: comp.provider,
        price: comp.price,
        bookingReference: comp.bookingReference,
        confirmationNumber: comp.confirmationNumber
      })),
      status: booking.status
    };

    res.status(200).json({
      success: true,
      data: receipt
    });

  } catch (error) {
    logger.error('Get booking receipt failed', {
      bookingId: req.params.bookingId,
      userId: req.user.id,
      error: error.message
    });

    res.status(404).json({
      success: false,
      message: 'Receipt not found',
      error: error.message
    });
  }
});

/**
 * @route POST /api/booking/customize/:eventId
 * @desc Get customization options for an event
 * @access Private
 */
router.post('/customize/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { dateFlexibility = 2, preferences = {} } = req.body;

    logger.info('Customization request received', {
      userId,
      eventId,
      dateFlexibility,
      preferences
    });

    // Get event details
    const eventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, ticket_url, min_price, max_price
      FROM events 
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = eventResult.rows[0];

    // Fetch real travel options for this event and user
    const options = await tripSuggestionEngine.searchTravelOptions(event, preferences);

    // For each component type, take the top 3 options
    const customizationOptions = {
      flight: (options.flight || []).slice(0, 3),
      hotel: (options.hotel || []).slice(0, 3),
      car: (options.car || []).slice(0, 3),
      ticket: (options.ticket || []).slice(0, 3)
    };

    res.status(200).json({
      success: true,
      data: customizationOptions
    });

  } catch (error) {
    logger.error('Customization request failed', {
      eventId: req.params.eventId,
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to load customization options',
      error: error.message
    });
  }
});

/**
 * @route POST /api/booking/create
 * @desc Create a new booking with selected components
 * @access Private
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, selectedComponents, preferences } = req.body;

    logger.info('Booking creation request received', {
      userId,
      eventId,
      componentCount: Object.keys(selectedComponents).length,
      preferences
    });

    // Get event details
    const eventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date
      FROM events 
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = eventResult.rows[0];

    // Calculate total cost
    const totalCost = Object.values(selectedComponents).reduce((sum, component) => {
      return sum + (component.price || 0);
    }, 0);

    const serviceFee = Math.round(totalCost * 0.05); // 5% service fee
    const grandTotal = totalCost + serviceFee;

    // Create trip plan
    const tripPlanResult = await pool.query(`
      INSERT INTO trip_plans (
        user_id, name, description, event_id, start_date, end_date, 
        budget, preferences, status, total_cost, service_fee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      userId,
      `${event.artist} - ${event.name}`,
      `Trip to see ${event.artist} at ${event.venue_name}`,
      eventId,
      event.event_date,
      event.event_date,
      grandTotal,
      JSON.stringify(preferences),
      'planning',
      totalCost,
      serviceFee
    ]);

    const tripPlanId = tripPlanResult.rows[0].id;

    // Create trip components
    for (const [componentType, component] of Object.entries(selectedComponents)) {
      await pool.query(`
        INSERT INTO trip_components (
          trip_plan_id, type, provider, price, details, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        tripPlanId,
        componentType,
        component.provider,
        component.price,
        JSON.stringify(component.details),
        'pending'
      ]);
    }

    // Create booking record
    const bookingResult = await pool.query(`
      INSERT INTO trip_bookings (
        trip_plan_id, user_id, booking_reference, total_amount, 
        service_fee, payment_status, booking_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      tripPlanId,
      userId,
      `BK-${Date.now()}-${userId}`,
      grandTotal,
      serviceFee,
      'pending',
      'pending'
    ]);

    const bookingId = bookingResult.rows[0].id;

    res.status(200).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        tripPlanId,
        bookingId,
        totalCost,
        serviceFee,
        grandTotal,
        status: 'pending'
      }
    });

  } catch (error) {
    logger.error('Booking creation failed', {
      userId: req.user.id,
      eventId: req.body.eventId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

/**
 * @route POST /api/booking/:bookingId/refund
 * @desc Request refund for booking
 * @access Private
 */
router.post('/:bookingId/refund', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason, components } = req.body;
    const userId = req.user.id;

    // This would integrate with payment processor for actual refund
    // For now, we'll simulate the refund process
    
    logger.info('Refund request received', {
      bookingId,
      userId,
      reason,
      components
    });

    // Update booking status to refund requested
    await bookingService.updateTripSuggestionBooking(bookingId, 'refund_requested', {
      reason,
      requestedAt: new Date().toISOString(),
      requestedBy: userId,
      components
    });

    res.status(200).json({
      success: true,
      message: 'Refund request submitted successfully',
      data: {
        bookingId,
        status: 'refund_requested',
        estimatedProcessingTime: '3-5 business days'
      }
    });

  } catch (error) {
    logger.error('Refund request failed', {
      bookingId: req.params.bookingId,
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to submit refund request',
      error: error.message
    });
  }
});

/**
 * @route GET /api/booking/providers
 * @desc Get available booking providers
 * @access Public
 */
router.get('/providers', (req, res) => {
  const providers = {
    flights: ['Skyscanner', 'Amadeus', 'Expedia', 'Kayak'],
    hotels: ['Booking.com', 'Hotels.com', 'Airbnb', 'Expedia'],
    tickets: ['Ticketmaster', 'Eventbrite', 'StubHub', 'Vivid Seats'],
    transportation: ['Uber', 'Lyft', 'Taxi', 'Public Transit'],
    cars: ['Hertz', 'Avis', 'Enterprise', 'Budget']
  };

  res.status(200).json({
    success: true,
    data: providers
  });
});

/**
 * @route GET /api/booking/health
 * @desc Check booking service health
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbQuery = 'SELECT 1 as health';
    await db.query(dbQuery);

    // Check Redis connectivity
    await redisClient.ping();

    res.status(200).json({
      success: true,
      message: 'Booking service is healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        booking: 'operational'
      }
    });

  } catch (error) {
    logger.error('Booking service health check failed', {
      error: error.message
    });

    res.status(503).json({
      success: false,
      message: 'Booking service is unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 