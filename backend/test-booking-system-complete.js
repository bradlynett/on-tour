const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
let authToken = null;
let testUserId = null;
let testTripSuggestionId = null;
let testBookingId = null;

// Test data
const testUser = {
    email: `test-booking-${Date.now()}@example.com`,
    password: 'TestPassword123',
    phone: '555-123-4567'
};

const testTripSuggestion = {
    user_id: null, // Will be set after user creation
    event_id: 1,
    destination: 'New York, NY',
    start_date: '2024-12-15',
    end_date: '2024-12-17',
    total_cost: 1250.00,
    service_fee: 75.00,
    grand_total: 1325.00,
    components: [
        {
            type: 'flight',
            provider: 'amadeus',
            provider_id: 'FLIGHT123',
            details: {
                origin: 'LAX',
                destination: 'JFK',
                airline: 'Delta',
                flight_number: 'DL123',
                departure_time: '2024-12-15T10:00:00Z',
                arrival_time: '2024-12-15T18:00:00Z'
            },
            price: 450.00,
            currency: 'USD'
        },
        {
            type: 'hotel',
            provider: 'amadeus',
            provider_id: 'HOTEL456',
            details: {
                name: 'Hilton Times Square',
                address: '234 W 42nd St, New York, NY',
                check_in: '2024-12-15',
                check_out: '2024-12-17',
                room_type: 'Standard King'
            },
            price: 300.00,
            currency: 'USD'
        },
        {
            type: 'ticket',
            provider: 'ticketmaster',
            provider_id: 'TICKET789',
            details: {
                event_name: 'Concert in the Park',
                venue: 'Central Park',
                section: 'General Admission',
                row: 'GA',
                seat: 'Standing'
            },
            price: 500.00,
            currency: 'USD'
        }
    ]
};

async function testBookingSystem() {
    console.log('🚀 Starting Comprehensive Booking System Test\n');

    try {
        // Step 1: Test User Registration and Authentication
        await testUserAuthentication();

        // Step 2: Test Trip Suggestions
        await testTripSuggestions();

        // Step 3: Test Booking Creation
        await testBookingCreation();

        // Step 4: Test Booking Status Checking
        await testBookingStatus();

        // Step 5: Test Booking History
        await testBookingHistory();

        // Step 6: Test Booking Cancellation
        await testBookingCancellation();

        // Step 7: Test Booking Analytics
        await testBookingAnalytics();

        // Step 8: Test Booking Notifications
        await testBookingNotifications();

        console.log('\n🎉 All Booking System Tests Completed Successfully!');
        console.log('\n📊 Test Summary:');
        console.log('✅ User Authentication');
        console.log('✅ Trip Suggestions');
        console.log('✅ Booking Creation');
        console.log('✅ Booking Status Checking');
        console.log('✅ Booking History');
        console.log('✅ Booking Cancellation');
        console.log('✅ Booking Analytics');
        console.log('✅ Booking Notifications');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

async function testUserAuthentication() {
    console.log('🔐 Testing User Authentication...');

    // Register user
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✅ User registration successful');

    // Login user
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
    });
    
    authToken = loginResponse.data.data.token;
    testUserId = loginResponse.data.data.user.id;
    testTripSuggestion.user_id = testUserId;
    
    console.log('✅ User login successful');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
}

async function testTripSuggestions() {
    console.log('\n🎯 Testing Trip Planning...');

    // Create a trip plan
    const tripPlanData = {
        name: 'New York Concert Trip',
        description: 'Weekend trip to see a concert in New York',
        event_id: 1,
        startDate: '2024-12-15',
        endDate: '2024-12-17',
        travelers: [{ name: 'Test User', email: testUser.email }],
        budget: 1500.00,
        preferences: {
            accommodation_type: 'hotel',
            transportation: 'flight',
            seating_preference: 'general_admission'
        }
    };

    const tripPlanResponse = await axios.post(`${BASE_URL}/trip-planning/plans`, tripPlanData, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    testTripSuggestionId = tripPlanResponse.data.data.tripPlanId;
    console.log('✅ Trip plan created successfully');
    console.log(`   Trip Plan ID: ${testTripSuggestionId}`);

    // Get trip plans for user
    const tripPlansResponse = await axios.get(`${BASE_URL}/trip-planning/plans`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Trip plans retrieved successfully');
    console.log(`   Found ${tripPlansResponse.data.count} trip plans`);
}

async function testBookingCreation() {
    console.log('\n📋 Testing Booking Creation...');

    const bookingData = {
        tripId: testTripSuggestionId,
        selections: testTripSuggestion.components.map(comp => ({
            componentType: comp.type,
            selectedOption: {
                id: comp.provider_id,
                provider: comp.provider,
                price: comp.price,
                features: ['Standard'],
                availability: 'available',
                details: comp.details
            }
        }))
    };

    const bookingResponse = await axios.post(`${BASE_URL}/booking/trip-suggestion/${testTripSuggestionId}`, bookingData, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    testBookingId = bookingResponse.data.data.bookingId;
    console.log('✅ Booking created successfully');
    console.log(`   Booking ID: ${testBookingId}`);
    console.log(`   Status: ${bookingResponse.data.data.status}`);
    console.log(`   Components: ${bookingResponse.data.data.components}`);
    console.log(`   Total Cost: $${bookingResponse.data.data.totalCost}`);
}

async function testBookingStatus() {
    console.log('\n📊 Testing Booking Status...');

    // Check booking status
    const statusResponse = await axios.get(`${BASE_URL}/booking/status/${testBookingId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Booking status retrieved successfully');
    console.log(`   Status: ${statusResponse.data.status}`);
    console.log(`   Components: ${statusResponse.data.components.length}`);

    // Check individual component statuses
    statusResponse.data.components.forEach(comp => {
        console.log(`   - ${comp.type}: ${comp.status}`);
    });
}

async function testBookingHistory() {
    console.log('\n📚 Testing Booking History...');

    const historyResponse = await axios.get(`${BASE_URL}/booking/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Booking history retrieved successfully');
    console.log(`   Found ${historyResponse.data.length} bookings`);

    if (historyResponse.data.length > 0) {
        const latestBooking = historyResponse.data[0];
        console.log(`   Latest booking: ${latestBooking.booking_id} (${latestBooking.status})`);
    }
}

async function testBookingCancellation() {
    console.log('\n❌ Testing Booking Cancellation...');

    const cancelResponse = await axios.post(`${BASE_URL}/booking/${testBookingId}/cancel`, {
        reason: 'Test cancellation',
        refund_requested: true
    }, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Booking cancelled successfully');
    console.log(`   Status: ${cancelResponse.data.data.status}`);
    console.log(`   Refund requested: ${cancelResponse.data.data.refund_requested}`);

    // Verify cancellation in status
    const statusResponse = await axios.get(`${BASE_URL}/booking/status/${testBookingId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`   Verified status: ${statusResponse.data.data.status}`);
}

async function testBookingAnalytics() {
    console.log('\n📈 Testing Booking Analytics...');

    const analyticsResponse = await axios.get(`${BASE_URL}/booking/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Booking analytics retrieved successfully');
    console.log(`   Total bookings: ${analyticsResponse.data.total_bookings}`);
    console.log(`   Successful bookings: ${analyticsResponse.data.successful_bookings}`);
    console.log(`   Failed bookings: ${analyticsResponse.data.failed_bookings}`);
    console.log(`   Total spent: $${analyticsResponse.data.total_spent}`);
}

async function testBookingNotifications() {
    console.log('\n🔔 Testing Booking Notifications...');

    const notificationsResponse = await axios.get(`${BASE_URL}/booking/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Booking notifications retrieved successfully');
    console.log(`   Found ${notificationsResponse.data.length} notifications`);

    if (notificationsResponse.data.length > 0) {
        notificationsResponse.data.forEach(notification => {
            console.log(`   - ${notification.type}: ${notification.title}`);
        });
    }
}

// Run the tests
testBookingSystem().catch(console.error); 