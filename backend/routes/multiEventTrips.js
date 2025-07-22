const express = require('express');
const router = express.Router();
const multiEventTripService = require('../services/multiEventTripService');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * @route POST /api/multi-event-trips
 * @desc Create a new multi-event trip plan
 * @access Private
 */
// router.post('/', auth, validation.validateMultiEventTrip, async (req, res) => {
//   try {
//     const { events, preferences } = req.body;
//     const userId = req.user.id;

//     logger.info(`Creating multi-event trip for user ${userId} with ${events.length} events`);

//     const multiEventTrip = await multiEventTripService.createMultiEventTrip(
//       userId,
//       events,
//       preferences
//     );

//     res.status(201).json({
//       success: true,
//       data: multiEventTrip,
//       message: 'Multi-event trip created successfully'
//     });

//   } catch (error) {
//     logger.error('Error creating multi-event trip:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to create multi-event trip'
//     });
//   }
// });

/**
 * @route GET /api/multi-event-trips
 * @desc Get user's multi-event trips
 * @access Private
 */
// router.get('/', auth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { status, limit = 20, offset = 0 } = req.query;

//     logger.info(`Getting multi-event trips for user ${userId}`);

//     const trips = await multiEventTripService.getUserMultiEventTrips(userId);

//     // Apply filters
//     let filteredTrips = trips;
//     if (status) {
//       filteredTrips = trips.filter(trip => trip.status === status);
//     }

//     // Apply pagination
//     const paginatedTrips = filteredTrips.slice(offset, offset + limit);

//     res.json({
//       success: true,
//       data: {
//         trips: paginatedTrips,
//         total: filteredTrips.length,
//         limit: parseInt(limit),
//         offset: parseInt(offset)
//       }
//     });

//   } catch (error) {
//     logger.error('Error getting multi-event trips:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to get multi-event trips'
//     });
//   }
// });

/**
 * @route GET /api/multi-event-trips/:id
 * @desc Get specific multi-event trip by ID
 * @access Private
 */
// router.get('/:id', auth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     logger.info(`Getting multi-event trip ${id} for user ${userId}`);

//     const trip = await multiEventTripService.getMultiEventTrip(id);

//     // Check if user owns this trip
//     if (trip.userId !== userId) {
//       return res.status(403).json({
//         success: false,
//         error: 'Access denied'
//       });
//     }

//     res.json({
//       success: true,
//       data: trip
//     });

//   } catch (error) {
//     logger.error('Error getting multi-event trip:', error);
//     if (error.message === 'Multi-event trip not found') {
//       return res.status(404).json({
//         success: false,
//         error: 'Multi-event trip not found'
//       });
//     }
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to get multi-event trip'
//     });
//   }
// });

/**
 * @route PUT /api/multi-event-trips/:id/status
 * @desc Update multi-event trip status
 * @access Private
 */
// router.put('/:id/status', auth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;
//     const userId = req.user.id;

//     logger.info(`Updating status of multi-event trip ${id} to ${status}`);

//     // Validate status
//     const validStatuses = ['planned', 'booked', 'cancelled', 'completed'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid status. Must be one of: planned, booked, cancelled, completed'
//       });
//     }

//     const updatedTrip = await multiEventTripService.updateTripStatus(id, status);

//     res.json({
//       success: true,
//       data: updatedTrip,
//       message: 'Trip status updated successfully'
//     });

//   } catch (error) {
//     logger.error('Error updating trip status:', error);
//     if (error.message === 'Multi-event trip not found') {
//       return res.status(404).json({
//         success: false,
//         error: 'Multi-event trip not found'
//       });
//     }
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to update trip status'
//     });
//   }
// });

/**
 * @route DELETE /api/multi-event-trips/:id
 * @desc Delete multi-event trip
 * @access Private
 */
// router.delete('/:id', auth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     logger.info(`Deleting multi-event trip ${id} for user ${userId}`);

//     const result = await multiEventTripService.deleteMultiEventTrip(id, userId);

//     res.json({
//       success: true,
//       data: result,
//       message: 'Multi-event trip deleted successfully'
//     });

//   } catch (error) {
//     logger.error('Error deleting multi-event trip:', error);
//     if (error.message === 'Multi-event trip not found or unauthorized') {
//       return res.status(404).json({
//         success: false,
//         error: 'Multi-event trip not found or unauthorized'
//       });
//     }
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to delete multi-event trip'
//     });
//   }
// });

/**
 * @route POST /api/multi-event-trips/:id/optimize
 * @desc Re-optimize route for existing multi-event trip
 * @access Private
 */
// router.post('/:id/optimize', auth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { preferences } = req.body;
//     const userId = req.user.id;

//     logger.info(`Re-optimizing route for multi-event trip ${id}`);

//     // Get existing trip
//     const existingTrip = await multiEventTripService.getMultiEventTrip(id);
    
//     if (existingTrip.userId !== userId) {
//       return res.status(403).json({
//         success: false,
//         error: 'Access denied'
//       });
//     }

//     // Re-optimize with new preferences
//     const optimizedRoute = await multiEventTripService.optimizeRoute(
//       existingTrip.events,
//       preferences
//     );

//     // Update trip with new route
//     const updatedTrip = await multiEventTripService.updateTripRoute(id, optimizedRoute);

//     res.json({
//       success: true,
//       data: updatedTrip,
//       message: 'Route optimized successfully'
//     });

//   } catch (error) {
//     logger.error('Error optimizing route:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to optimize route'
//     });
//   }
// });

/**
 * @route GET /api/multi-event-trips/:id/route
 * @desc Get route details for multi-event trip
 * @access Private
 */
// router.get('/:id/route', auth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     logger.info(`Getting route details for multi-event trip ${id}`);

//     const trip = await multiEventTripService.getMultiEventTrip(id);
    
//     if (trip.userId !== userId) {
//       return res.status(403).json({
//         success: false,
//         error: 'Access denied'
//       });
//     }

//     res.json({
//       success: true,
//       data: {
//         route: trip.route,
//         events: trip.events,
//         costAnalysis: trip.costAnalysis
//       }
//     });

//   } catch (error) {
//     logger.error('Error getting route details:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to get route details'
//     });
//   }
// });

/**
 * @route POST /api/multi-event-trips/:id/share
 * @desc Share multi-event trip with other users
 * @access Private
 */
// router.post('/:id/share', auth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { userEmails, permissions } = req.body;
//     const userId = req.user.id;

//     logger.info(`Sharing multi-event trip ${id} with users: ${userEmails.join(', ')}`);

//     // This would integrate with a sharing service
//     // For now, return a success response
//     res.json({
//       success: true,
//       message: 'Trip shared successfully',
//       data: {
//         sharedWith: userEmails,
//         permissions: permissions || ['view']
//       }
//     });

//   } catch (error) {
//     logger.error('Error sharing trip:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to share trip'
//     });
//   }
// });

module.exports = router; 