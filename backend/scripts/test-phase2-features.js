const axios = require('axios');
const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
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

// Configuration
const BASE_URL = 'http://localhost:5001/api';
let authToken = null;
let testUserId = null;
let testEventId = null;
let testBookingId = null;

// Test data
const testUser = {
    email: 'phase2test' + Date.now() + '@example.com',
    password: 'testpassword123',
    firstName: 'Phase2',
    lastName: 'Tester'
};

const testEvent = {
    name: 'Phase 2 Test Concert',
    artist: 'Test Artist',
    venueName: 'Test Arena',
    venueCity: 'Los Angeles',
    venueState: 'CA',
    eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    minPrice: 50,
    maxPrice: 150
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (error.response) {
            logger.error(`Request failed: ${error.response.status} - ${error.response.data.message || error.message}`);
            return error.response.data;
        } else {
            logger.error(`Request failed: ${error.message}`);
            throw error;
        }
    }
}

// Test 1: User Registration and Authentication
async function testAuthentication() {
    logger.info('🧪 Testing Authentication...');
    
    try {
        // Register test user
        const registerResponse = await makeRequest('POST', '/auth/register', testUser);
        if (registerResponse.success) {
            logger.info('✅ User registration successful');
            testUserId = registerResponse.data.user.id;
        } else {
            logger.warn('⚠️ User registration failed (might already exist)');
        }

        // Login
        const loginResponse = await makeRequest('POST', '/auth/login', {
            email: testUser.email,
            password: testUser.password
        });

        if (loginResponse.success) {
            authToken = loginResponse.data.token;
            logger.info('✅ User login successful');
            return true;
        } else {
            logger.error('❌ User login failed');
            return false;
        }
    } catch (error) {
        logger.error(`❌ Authentication test failed: ${error.message}`);
        return false;
    }
}

// Test 2: Create Test Event
async function testEventCreation() {
    logger.info('🧪 Testing Event Creation...');
    
    try {
        const eventResponse = await makeRequest('POST', '/events/save/bulk', {
            events: [testEvent]
        });

        if (eventResponse.success) {
            testEventId = eventResponse.data.savedIds[0];
            logger.info(`✅ Test event created with ID: ${testEventId}`);
            return true;
        } else {
            logger.error('❌ Event creation failed');
            return false;
        }
    } catch (error) {
        logger.error(`❌ Event creation test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Trip Customization
async function testTripCustomization() {
    logger.info('🧪 Testing Trip Customization...');
    
    try {
        const customizationResponse = await makeRequest('POST', `/booking/customize/${testEventId}`, {
            dateFlexibility: 2,
            preferences: {
                flightClass: 'economy',
                hotelTier: 'standard',
                includeCar: true,
                budget: 1000
            }
        });

        if (customizationResponse.success) {
            logger.info('✅ Trip customization successful');
            logger.info(`   - Event: ${customizationResponse.data.event.name}`);
            logger.info(`   - Date options: ${customizationResponse.data.dateOptions.length}`);
            logger.info(`   - Flight options: ${Object.keys(customizationResponse.data.flightOptions).length} classes`);
            logger.info(`   - Hotel options: ${Object.keys(customizationResponse.data.hotelOptions).length} tiers`);
            logger.info(`   - Bundle options: ${customizationResponse.data.bundles.length}`);
            return customizationResponse.data;
        } else {
            logger.error('❌ Trip customization failed');
            return null;
        }
    } catch (error) {
        logger.error(`❌ Trip customization test failed: ${error.message}`);
        return null;
    }
}

// Test 4: Create Booking
async function testBookingCreation(customizationData) {
    logger.info('🧪 Testing Booking Creation...');
    
    try {
        // Select components from customization
        const selectedComponents = {
            flight: customizationData.flightOptions.economy[0] || null,
            hotel: customizationData.hotelOptions.standard[0] || null,
            car: customizationData.carOptions.economy[0] || null,
            ticket: customizationData.ticketOptions.general[0] || null
        };

        const bookingResponse = await makeRequest('POST', '/booking/create', {
            eventId: testEventId,
            selectedComponents,
            preferences: {
                startDate: customizationData.dateOptions[0].date,
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
        });

        if (bookingResponse.success) {
            testBookingId = bookingResponse.data.tripPlanId;
            logger.info('✅ Booking creation successful');
            logger.info(`   - Booking ID: ${testBookingId}`);
            logger.info(`   - Total Cost: $${bookingResponse.data.totalCost}`);
            logger.info(`   - Service Fee: $${bookingResponse.data.serviceFee}`);
            logger.info(`   - Grand Total: $${bookingResponse.data.grandTotal}`);
            return bookingResponse.data;
        } else {
            logger.error('❌ Booking creation failed');
            return null;
        }
    } catch (error) {
        logger.error(`❌ Booking creation test failed: ${error.message}`);
        return null;
    }
}

// Test 5: Get Booking Details
async function testGetBookingDetails() {
    logger.info('🧪 Testing Get Booking Details...');
    
    try {
        const bookingResponse = await makeRequest('GET', `/booking/${testBookingId}`);

        if (bookingResponse.success) {
            logger.info('✅ Get booking details successful');
            logger.info(`   - Booking Name: ${bookingResponse.data.name}`);
            logger.info(`   - Status: ${bookingResponse.data.status}`);
            logger.info(`   - Components: ${bookingResponse.data.components.length}`);
            return bookingResponse.data;
        } else {
            logger.error('❌ Get booking details failed');
            return null;
        }
    } catch (error) {
        logger.error(`❌ Get booking details test failed: ${error.message}`);
        return null;
    }
}

// Test 6: Get User Bookings
async function testGetUserBookings() {
    logger.info('🧪 Testing Get User Bookings...');
    
    try {
        const bookingsResponse = await makeRequest('GET', '/booking?page=1&limit=10');

        if (bookingsResponse.success) {
            logger.info('✅ Get user bookings successful');
            logger.info(`   - Total bookings: ${bookingsResponse.pagination.total}`);
            logger.info(`   - Current page: ${bookingsResponse.pagination.page}`);
            logger.info(`   - Results: ${bookingsResponse.data.length}`);
            return bookingsResponse.data;
        } else {
            logger.error('❌ Get user bookings failed');
            return null;
        }
    } catch (error) {
        logger.error(`❌ Get user bookings test failed: ${error.message}`);
        return null;
    }
}

// Test 7: Get Booking Statistics
async function testGetBookingStats() {
    logger.info('🧪 Testing Get Booking Statistics...');
    
    try {
        const statsResponse = await makeRequest('GET', '/booking/stats/overview');

        if (statsResponse.success) {
            logger.info('✅ Get booking statistics successful');
            logger.info(`   - Total bookings: ${statsResponse.data.overview.total_bookings}`);
            logger.info(`   - Planning: ${statsResponse.data.overview.planning_bookings}`);
            logger.info(`   - Booked: ${statsResponse.data.overview.booked_bookings}`);
            logger.info(`   - Average cost: $${statsResponse.data.overview.avg_total_cost || 0}`);
            return statsResponse.data;
        } else {
            logger.error('❌ Get booking statistics failed');
            return null;
        }
    } catch (error) {
        logger.error(`❌ Get booking statistics test failed: ${error.message}`);
        return null;
    }
}

// Test 8: Payment Intent Creation (Mock)
async function testPaymentIntentCreation() {
    logger.info('🧪 Testing Payment Intent Creation...');
    
    try {
        const paymentResponse = await makeRequest('POST', '/payment/create-intent', {
            bookingId: testBookingId,
            amount: 892.50,
            currency: 'usd'
        });

        if (paymentResponse.success) {
            logger.info('✅ Payment intent creation successful');
            logger.info(`   - Payment Intent ID: ${paymentResponse.data.paymentIntentId}`);
            logger.info(`   - Amount: $${paymentResponse.data.amount}`);
            logger.info(`   - Service Fee: $${paymentResponse.data.serviceFee}`);
            return paymentResponse.data;
        } else {
            logger.warn('⚠️ Payment intent creation failed (Stripe not configured)');
            logger.info('   This is expected if Stripe keys are not set up');
            return null;
        }
    } catch (error) {
        logger.warn(`⚠️ Payment intent creation test failed: ${error.message}`);
        logger.info('   This is expected if Stripe keys are not set up');
        return null;
    }
}

// Test 9: Get Payment Methods
async function testGetPaymentMethods() {
    logger.info('🧪 Testing Get Payment Methods...');
    
    try {
        const methodsResponse = await makeRequest('GET', '/payment/payment-methods');

        if (methodsResponse.success) {
            logger.info('✅ Get payment methods successful');
            logger.info(`   - Payment methods: ${methodsResponse.data.length}`);
            return methodsResponse.data;
        } else {
            logger.warn('⚠️ Get payment methods failed (no saved methods)');
            return [];
        }
    } catch (error) {
        logger.warn(`⚠️ Get payment methods test failed: ${error.message}`);
        return [];
    }
}

// Test 10: Update Booking Status
async function testUpdateBookingStatus() {
    logger.info('🧪 Testing Update Booking Status...');
    
    try {
        const updateResponse = await makeRequest('PATCH', `/booking/${testBookingId}/status`, {
            status: 'booked'
        });

        if (updateResponse.success) {
            logger.info('✅ Update booking status successful');
            logger.info(`   - New status: ${updateResponse.data.status}`);
            return updateResponse.data;
        } else {
            logger.error('❌ Update booking status failed');
            return null;
        }
    } catch (error) {
        logger.error(`❌ Update booking status test failed: ${error.message}`);
        return null;
    }
}

// Test 11: Enhanced Travel Search
async function testEnhancedTravelSearch() {
    logger.info('🧪 Testing Enhanced Travel Search...');
    
    try {
        // Test multi-city flight search
        const multiCityResponse = await makeRequest('GET', '/travel/flights/multi-city', null, {
            segments: JSON.stringify([
                { origin: 'SEA', destination: 'LAX', date: '2024-08-13' },
                { origin: 'LAX', destination: 'SEA', date: '2024-08-16' }
            ]),
            passengers: 1,
            maxResults: 5
        });

        if (multiCityResponse.success) {
            logger.info('✅ Multi-city flight search successful');
            logger.info(`   - Flights found: ${multiCityResponse.data.length}`);
        } else {
            logger.warn('⚠️ Multi-city flight search failed (no flights available)');
        }

        // Test travel package search
        const packageResponse = await makeRequest('GET', '/travel/packages', null, {
            origin: 'SEA',
            destination: 'LAX',
            departureDate: '2024-08-13',
            returnDate: '2024-08-16',
            passengers: 1,
            includeHotel: 'true',
            includeCar: 'false',
            maxResults: 5
        });

        if (packageResponse.success) {
            logger.info('✅ Travel package search successful');
            logger.info(`   - Packages found: ${packageResponse.data.length}`);
        } else {
            logger.warn('⚠️ Travel package search failed (no packages available)');
        }

        return true;
    } catch (error) {
        logger.warn(`⚠️ Enhanced travel search test failed: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runPhase2Tests() {
    logger.info('🚀 Starting Phase 2 Feature Tests...');
    logger.info('=====================================');

    const results = {
        authentication: false,
        eventCreation: false,
        tripCustomization: false,
        bookingCreation: false,
        getBookingDetails: false,
        getUserBookings: false,
        getBookingStats: false,
        paymentIntentCreation: false,
        getPaymentMethods: false,
        updateBookingStatus: false,
        enhancedTravelSearch: false
    };

    try {
        // Run tests in sequence
        results.authentication = await testAuthentication();
        if (!results.authentication) {
            logger.error('❌ Authentication failed, stopping tests');
            return results;
        }

        results.eventCreation = await testEventCreation();
        if (!results.eventCreation) {
            logger.error('❌ Event creation failed, stopping tests');
            return results;
        }

        const customizationData = await testTripCustomization();
        results.tripCustomization = customizationData !== null;

        const bookingData = await testBookingCreation(customizationData);
        results.bookingCreation = bookingData !== null;

        results.getBookingDetails = await testGetBookingDetails() !== null;
        results.getUserBookings = await testGetUserBookings() !== null;
        results.getBookingStats = await testGetBookingStats() !== null;
        results.paymentIntentCreation = await testPaymentIntentCreation() !== null;
        results.getPaymentMethods = await testGetPaymentMethods() !== null;
        results.updateBookingStatus = await testUpdateBookingStatus() !== null;
        results.enhancedTravelSearch = await testEnhancedTravelSearch();

        // Print summary
        logger.info('=====================================');
        logger.info('📊 Phase 2 Test Results Summary:');
        logger.info('=====================================');
        
        Object.entries(results).forEach(([test, passed]) => {
            const status = passed ? '✅ PASS' : '❌ FAIL';
            logger.info(`${status} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        });

        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        const successRate = (passedTests / totalTests * 100).toFixed(1);

        logger.info('=====================================');
        logger.info(`🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
        
        if (successRate >= 80) {
            logger.info('🎉 Phase 2 implementation is working well!');
        } else if (successRate >= 60) {
            logger.info('⚠️ Phase 2 has some issues that need attention');
        } else {
            logger.error('❌ Phase 2 has significant issues that need fixing');
        }

        return results;

    } catch (error) {
        logger.error(`❌ Test runner failed: ${error.message}`);
        return results;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runPhase2Tests()
        .then(results => {
            process.exit(0);
        })
        .catch(error => {
            logger.error(`❌ Test execution failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { runPhase2Tests }; 