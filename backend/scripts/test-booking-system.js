const axios = require('axios');
const { logger } = require('../utils/logger');

const API_BASE_URL = 'http://localhost:5001/api';

// Test user credentials
const TEST_USER = {
    email: 'test@example.com',
    password: 'testpassword123'
};

let authToken = null;
let testTripId = null;
let testBookingId = null;

// Utility functions
const logTest = (testName, status, details = '') => {
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${testName}: ${status} ${details}`);
    logger.info(`Test ${testName}: ${status} ${details}`);
};

const makeRequest = async (method, endpoint, data = null, token = authToken) => {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...(data && { data })
        };

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message, 
            status: error.response?.status 
        };
    }
};

// Test 1: User Authentication
const testAuthentication = async () => {
    console.log('\n🔐 Testing Authentication...');
    
    // Test registration
    const registerResult = await makeRequest('POST', '/auth/register', TEST_USER);
    if (registerResult.success) {
        logTest('User Registration', 'PASS', 'User registered successfully');
    } else if (registerResult.status === 409) {
        logTest('User Registration', 'SKIP', 'User already exists');
    } else {
        logTest('User Registration', 'FAIL', registerResult.error);
        return false;
    }

    // Test login
    const loginResult = await makeRequest('POST', '/auth/login', TEST_USER);
    if (loginResult.success && loginResult.data.token) {
        authToken = loginResult.data.token;
        logTest('User Login', 'PASS', 'Login successful');
        return true;
    } else {
        logTest('User Login', 'FAIL', loginResult.error);
        return false;
    }
};

// Test 2: Get Trip Suggestions
const testGetTripSuggestions = async () => {
    console.log('\n🎯 Testing Trip Suggestions...');
    
    const result = await makeRequest('GET', '/trips');
    if (result.success && result.data.data?.suggestions?.length > 0) {
        testTripId = result.data.data.suggestions[0].id;
        logTest('Get Trip Suggestions', 'PASS', `Found ${result.data.data.suggestions.length} suggestions`);
        return true;
    } else {
        logTest('Get Trip Suggestions', 'FAIL', result.error);
        return false;
    }
};

// Test 3: Test Booking Providers
const testBookingProviders = async () => {
    console.log('\n🏢 Testing Booking Providers...');
    
    const result = await makeRequest('GET', '/booking/providers');
    if (result.success && result.data.data) {
        const providers = result.data.data;
        const providerCount = Object.values(providers).flat().length;
        logTest('Get Booking Providers', 'PASS', `Found ${providerCount} providers across ${Object.keys(providers).length} categories`);
        return true;
    } else {
        logTest('Get Booking Providers', 'FAIL', result.error);
        return false;
    }
};

// Test 4: Test Booking Health
const testBookingHealth = async () => {
    console.log('\n🏥 Testing Booking Service Health...');
    
    const result = await makeRequest('GET', '/booking/health');
    if (result.success && result.data.status === 'healthy') {
        logTest('Booking Service Health', 'PASS', 'Service is healthy');
        return true;
    } else {
        logTest('Booking Service Health', 'FAIL', result.error);
        return false;
    }
};

// Test 5: Create Trip Booking
const testCreateBooking = async () => {
    console.log('\n📋 Testing Trip Booking Creation...');
    
    if (!testTripId) {
        logTest('Create Trip Booking', 'SKIP', 'No trip ID available');
        return false;
    }

    const bookingData = {
        tripId: testTripId,
        selections: [
            {
                componentType: 'flight',
                selectedOption: {
                    id: 'flight-test-1',
                    provider: 'Delta Airlines',
                    price: 350,
                    features: ['Direct Flight', 'Free WiFi'],
                    availability: 'available',
                    details: {
                        departure: 'JFK',
                        arrival: 'LAX',
                        departureTime: '10:00 AM',
                        arrivalTime: '1:30 PM'
                    }
                }
            },
            {
                componentType: 'hotel',
                selectedOption: {
                    id: 'hotel-test-1',
                    provider: 'Marriott',
                    price: 180,
                    features: ['Free WiFi', 'Pool', 'Gym'],
                    availability: 'available',
                    details: {
                        name: 'Marriott Downtown',
                        roomType: 'King Room',
                        checkIn: '3:00 PM',
                        checkOut: '11:00 AM'
                    }
                }
            },
            {
                componentType: 'ticket',
                selectedOption: {
                    id: 'ticket-test-1',
                    provider: 'Ticketmaster',
                    price: 85,
                    features: ['Official Ticket', 'Mobile Delivery'],
                    availability: 'available',
                    details: {
                        ticketType: 'General Admission',
                        section: 'GA',
                        delivery: 'Mobile'
                    }
                }
            }
        ]
    };

    const result = await makeRequest('POST', '/booking/trip', bookingData);
    if (result.success && result.data.data?.bookingId) {
        testBookingId = result.data.data.bookingId;
        logTest('Create Trip Booking', 'PASS', `Booking ID: ${testBookingId}`);
        return true;
    } else {
        logTest('Create Trip Booking', 'FAIL', result.error);
        return false;
    }
};

// Test 6: Check Booking Status
const testCheckBookingStatus = async () => {
    console.log('\n📊 Testing Booking Status Check...');
    
    if (!testBookingId) {
        logTest('Check Booking Status', 'SKIP', 'No booking ID available');
        return false;
    }

    // Wait a moment for background processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await makeRequest('GET', `/booking/status/${testBookingId}`);
    if (result.success && result.data.data) {
        const booking = result.data.data;
        logTest('Check Booking Status', 'PASS', `Status: ${booking.status}, Components: ${booking.components?.length || 0}`);
        return true;
    } else {
        logTest('Check Booking Status', 'FAIL', result.error);
        return false;
    }
};

// Test 7: Get Booking History
const testGetBookingHistory = async () => {
    console.log('\n📚 Testing Booking History...');
    
    const result = await makeRequest('GET', '/booking/history');
    if (result.success && result.data.data?.bookings) {
        const bookings = result.data.data.bookings;
        logTest('Get Booking History', 'PASS', `Found ${bookings.length} bookings`);
        return true;
    } else {
        logTest('Get Booking History', 'FAIL', result.error);
        return false;
    }
};

// Test 8: Get Booking Analytics
const testGetBookingAnalytics = async () => {
    console.log('\n📈 Testing Booking Analytics...');
    
    const result = await makeRequest('GET', '/booking/analytics');
    if (result.success && result.data.data) {
        const analytics = result.data.data;
        logTest('Get Booking Analytics', 'PASS', `Total bookings: ${analytics.total_bookings}`);
        return true;
    } else {
        logTest('Get Booking Analytics', 'FAIL', result.error);
        return false;
    }
};

// Test 9: Get Booking Receipt
const testGetBookingReceipt = async () => {
    console.log('\n🧾 Testing Booking Receipt...');
    
    if (!testBookingId) {
        logTest('Get Booking Receipt', 'SKIP', 'No booking ID available');
        return false;
    }

    const result = await makeRequest('GET', `/booking/receipt/${testBookingId}`);
    if (result.success && result.data.data) {
        const receipt = result.data.data;
        logTest('Get Booking Receipt', 'PASS', `Receipt generated for ${receipt.totalAmount}`);
        return true;
    } else {
        logTest('Get Booking Receipt', 'FAIL', result.error);
        return false;
    }
};

// Test 10: Request Refund
const testRequestRefund = async () => {
    console.log('\n💰 Testing Refund Request...');
    
    if (!testBookingId) {
        logTest('Request Refund', 'SKIP', 'No booking ID available');
        return false;
    }

    const refundData = {
        reason: 'Change of plans - need to cancel this booking due to unexpected circumstances',
        components: ['flight', 'hotel']
    };

    const result = await makeRequest('POST', `/booking/${testBookingId}/refund`, refundData);
    if (result.success && result.data.data) {
        logTest('Request Refund', 'PASS', 'Refund request submitted');
        return true;
    } else {
        logTest('Request Refund', 'FAIL', result.error);
        return false;
    }
};

// Test 11: Cancel Booking
const testCancelBooking = async () => {
    console.log('\n❌ Testing Booking Cancellation...');
    
    if (!testBookingId) {
        logTest('Cancel Booking', 'SKIP', 'No booking ID available');
        return false;
    }

    const result = await makeRequest('POST', `/booking/${testBookingId}/cancel`);
    if (result.success && result.data.data) {
        logTest('Cancel Booking', 'PASS', 'Booking cancelled successfully');
        return true;
    } else {
        logTest('Cancel Booking', 'FAIL', result.error);
        return false;
    }
};

// Test 12: Validation Tests
const testValidation = async () => {
    console.log('\n🔍 Testing Validation...');
    
    // Test invalid booking request
    const invalidBookingData = {
        tripId: 'invalid',
        selections: []
    };

    const result = await makeRequest('POST', '/booking/trip', invalidBookingData);
    if (!result.success && result.status === 400) {
        logTest('Invalid Booking Validation', 'PASS', 'Validation caught invalid data');
    } else {
        logTest('Invalid Booking Validation', 'FAIL', 'Validation should have failed');
    }

    // Test invalid refund request
    const invalidRefundData = {
        reason: 'Too short'
    };

    const refundResult = await makeRequest('POST', `/booking/${testBookingId || 'test'}/refund`, invalidRefundData);
    if (!refundResult.success && refundResult.status === 400) {
        logTest('Invalid Refund Validation', 'PASS', 'Validation caught invalid refund data');
    } else {
        logTest('Invalid Refund Validation', 'FAIL', 'Validation should have failed');
    }

    return true;
};

// Main test runner
const runAllTests = async () => {
    console.log('🚀 Starting Booking System Tests...\n');
    
    const tests = [
        { name: 'Authentication', fn: testAuthentication },
        { name: 'Trip Suggestions', fn: testGetTripSuggestions },
        { name: 'Booking Providers', fn: testBookingProviders },
        { name: 'Booking Health', fn: testBookingHealth },
        { name: 'Create Booking', fn: testCreateBooking },
        { name: 'Check Status', fn: testCheckBookingStatus },
        { name: 'Booking History', fn: testGetBookingHistory },
        { name: 'Booking Analytics', fn: testGetBookingAnalytics },
        { name: 'Booking Receipt', fn: testGetBookingReceipt },
        { name: 'Request Refund', fn: testRequestRefund },
        { name: 'Cancel Booking', fn: testCancelBooking },
        { name: 'Validation', fn: testValidation }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) passedTests++;
        } catch (error) {
            logTest(test.name, 'ERROR', error.message);
        }
    }

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Booking system is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
    }

    process.exit(passedTests === totalTests ? 0 : 1);
};

// Handle script execution
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testAuthentication,
    testCreateBooking,
    testCheckBookingStatus
}; 