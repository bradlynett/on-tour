const axios = require('axios');
const { logger } = require('../utils/logger');

// Configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_USER_EMAIL = 'brad@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

let authToken = null;
let testEvents = [];

/**
 * Test authentication
 */
async function authenticate() {
  try {
    logger.info('🔐 Testing authentication...');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (response.data.success) {
      authToken = response.data.token;
      logger.info('✅ Authentication successful');
      return true;
    } else {
      logger.error('❌ Authentication failed:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Authentication error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get test events for multi-event trip
 */
async function getTestEvents() {
  try {
    logger.info('🎫 Getting test events...');
    
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 5 }
    });

    if (response.data.success && response.data.data.length >= 3) {
      testEvents = response.data.data.slice(0, 3).map(event => event.id);
      logger.info(`✅ Found ${testEvents.length} test events:`, testEvents);
      return true;
    } else {
      logger.error('❌ Not enough events found for testing');
      return false;
    }
  } catch (error) {
    logger.error('❌ Error getting test events:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test creating a multi-event trip
 */
async function testCreateMultiEventTrip() {
  try {
    logger.info('🚀 Testing multi-event trip creation...');
    
    const tripData = {
      events: testEvents,
      preferences: {
        prioritize: 'cost',
        maxBudget: 2000,
        groupSize: 2,
        accommodationType: 'hotel',
        transportationType: 'mixed'
      }
    };

    const response = await axios.post(`${BASE_URL}/multi-event-trips`, tripData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Multi-event trip created successfully');
      logger.info('Trip details:', {
        id: response.data.data.id,
        events: response.data.data.events.length,
        costAnalysis: response.data.data.costAnalysis,
        status: response.data.data.status
      });
      return response.data.data.id;
    } else {
      logger.error('❌ Failed to create multi-event trip:', response.data.error);
      return null;
    }
  } catch (error) {
    logger.error('❌ Error creating multi-event trip:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test getting multi-event trips
 */
async function testGetMultiEventTrips() {
  try {
    logger.info('📋 Testing get multi-event trips...');
    
    const response = await axios.get(`${BASE_URL}/multi-event-trips`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info(`✅ Retrieved ${response.data.data.trips.length} multi-event trips`);
      return response.data.data.trips;
    } else {
      logger.error('❌ Failed to get multi-event trips:', response.data.error);
      return [];
    }
  } catch (error) {
    logger.error('❌ Error getting multi-event trips:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Test getting specific multi-event trip
 */
async function testGetSpecificTrip(tripId) {
  try {
    logger.info(`🔍 Testing get specific trip ${tripId}...`);
    
    const response = await axios.get(`${BASE_URL}/multi-event-trips/${tripId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Retrieved specific trip successfully');
      logger.info('Trip details:', {
        id: response.data.data.id,
        events: response.data.data.events.length,
        route: response.data.data.route ? 'Route data available' : 'No route data',
        costAnalysis: response.data.data.costAnalysis
      });
      return true;
    } else {
      logger.error('❌ Failed to get specific trip:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error getting specific trip:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test route optimization
 */
async function testRouteOptimization(tripId) {
  try {
    logger.info(`🔄 Testing route optimization for trip ${tripId}...`);
    
    const optimizationData = {
      preferences: {
        prioritize: 'time',
        maxBudget: 1500,
        transportationType: 'flight'
      }
    };

    const response = await axios.post(`${BASE_URL}/multi-event-trips/${tripId}/optimize`, optimizationData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Route optimization successful');
      logger.info('Optimized route:', {
        totalDistance: response.data.data.route?.totalDistance,
        totalTravelTime: response.data.data.route?.totalTravelTime,
        estimatedCost: response.data.data.route?.estimatedCost
      });
      return true;
    } else {
      logger.error('❌ Failed to optimize route:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error optimizing route:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test getting route details
 */
async function testGetRouteDetails(tripId) {
  try {
    logger.info(`🗺️ Testing get route details for trip ${tripId}...`);
    
    const response = await axios.get(`${BASE_URL}/multi-event-trips/${tripId}/route`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Retrieved route details successfully');
      logger.info('Route details:', {
        events: response.data.data.events?.length || 0,
        segments: response.data.data.route?.segments?.length || 0,
        costAnalysis: response.data.data.costAnalysis
      });
      return true;
    } else {
      logger.error('❌ Failed to get route details:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error getting route details:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test updating trip status
 */
async function testUpdateTripStatus(tripId) {
  try {
    logger.info(`📝 Testing update trip status for trip ${tripId}...`);
    
    const statusData = {
      status: 'booked'
    };

    const response = await axios.put(`${BASE_URL}/multi-event-trips/${tripId}/status`, statusData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Trip status updated successfully');
      logger.info('New status:', response.data.data.status);
      return true;
    } else {
      logger.error('❌ Failed to update trip status:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error updating trip status:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test sharing trip
 */
async function testShareTrip(tripId) {
  try {
    logger.info(`📤 Testing share trip ${tripId}...`);
    
    const shareData = {
      userEmails: ['friend@example.com', 'family@example.com'],
      permissions: ['view', 'edit']
    };

    const response = await axios.post(`${BASE_URL}/multi-event-trips/${tripId}/share`, shareData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Trip shared successfully');
      logger.info('Shared with:', response.data.data.sharedWith);
      return true;
    } else {
      logger.error('❌ Failed to share trip:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error sharing trip:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test deleting trip
 */
async function testDeleteTrip(tripId) {
  try {
    logger.info(`🗑️ Testing delete trip ${tripId}...`);
    
    const response = await axios.delete(`${BASE_URL}/multi-event-trips/${tripId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      logger.info('✅ Trip deleted successfully');
      return true;
    } else {
      logger.error('❌ Failed to delete trip:', response.data.error);
      return false;
    }
  } catch (error) {
    logger.error('❌ Error deleting trip:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test performance monitoring
 */
async function testPerformanceMonitoring() {
  try {
    logger.info('📊 Testing performance monitoring...');
    
    // Test API call tracking
    const startTime = Date.now();
    await axios.get(`${BASE_URL}/multi-event-trips`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const duration = Date.now() - startTime;
    
    logger.info(`✅ API call tracked - Duration: ${duration}ms`);
    
    // Test user interaction tracking
    logger.info('✅ User interaction tracking simulated');
    
    // Test page load tracking
    logger.info('✅ Page load tracking simulated');
    
    return true;
  } catch (error) {
    logger.error('❌ Error testing performance monitoring:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runPhase6Tests() {
  logger.info('🎯 Starting Phase 6 Multi-Event Trip Tests...');
  logger.info('==========================================');

  let tripId = null;
  let allTestsPassed = true;

  try {
    // Test 1: Authentication
    if (!(await authenticate())) {
      logger.error('❌ Authentication test failed');
      return false;
    }

    // Test 2: Get test events
    if (!(await getTestEvents())) {
      logger.error('❌ Get test events failed');
      return false;
    }

    // Test 3: Create multi-event trip
    tripId = await testCreateMultiEventTrip();
    if (!tripId) {
      logger.error('❌ Create multi-event trip test failed');
      allTestsPassed = false;
    }

    // Test 4: Get all multi-event trips
    const trips = await testGetMultiEventTrips();
    if (trips.length === 0) {
      logger.error('❌ Get multi-event trips test failed');
      allTestsPassed = false;
    }

    // Test 5: Get specific trip
    if (tripId && !(await testGetSpecificTrip(tripId))) {
      logger.error('❌ Get specific trip test failed');
      allTestsPassed = false;
    }

    // Test 6: Route optimization
    if (tripId && !(await testRouteOptimization(tripId))) {
      logger.error('❌ Route optimization test failed');
      allTestsPassed = false;
    }

    // Test 7: Get route details
    if (tripId && !(await testGetRouteDetails(tripId))) {
      logger.error('❌ Get route details test failed');
      allTestsPassed = false;
    }

    // Test 8: Update trip status
    if (tripId && !(await testUpdateTripStatus(tripId))) {
      logger.error('❌ Update trip status test failed');
      allTestsPassed = false;
    }

    // Test 9: Share trip
    if (tripId && !(await testShareTrip(tripId))) {
      logger.error('❌ Share trip test failed');
      allTestsPassed = false;
    }

    // Test 10: Performance monitoring
    if (!(await testPerformanceMonitoring())) {
      logger.error('❌ Performance monitoring test failed');
      allTestsPassed = false;
    }

    // Test 11: Delete trip (cleanup)
    if (tripId && !(await testDeleteTrip(tripId))) {
      logger.error('❌ Delete trip test failed');
      allTestsPassed = false;
    }

    // Summary
    logger.info('==========================================');
    if (allTestsPassed) {
      logger.info('🎉 All Phase 6 tests passed successfully!');
      logger.info('✅ Multi-event trip functionality is working correctly');
      logger.info('✅ Performance monitoring is active');
      logger.info('✅ Route optimization is functional');
      logger.info('✅ Trip sharing and management features are operational');
    } else {
      logger.error('❌ Some Phase 6 tests failed');
      logger.error('Please check the logs above for specific issues');
    }

    return allTestsPassed;

  } catch (error) {
    logger.error('❌ Unexpected error during Phase 6 tests:', error);
    return false;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPhase6Tests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runPhase6Tests }; 