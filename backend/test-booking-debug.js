const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test data
const testUser = {
    email: `test-booking-debug-${Date.now()}@example.com`,
    password: 'TestPassword123',
    phone: '555-123-4567'
};

async function testDebug() {
    console.log('🚀 Starting Debug Test\n');

    try {
        console.log('🔐 Testing User Registration...');
        console.log('User email:', testUser.email);

        // Register user
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
        console.log('✅ User registration successful');

        console.log('\n🔐 Testing User Login...');
        
        // Login user
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        console.log('✅ User login successful');

        const authToken = loginResponse.data.data.token;
        const testUserId = loginResponse.data.data.user.id;
        
        console.log(`\n📊 User Details:`);
        console.log(`   User ID: ${testUserId}`);
        console.log(`   Token: ${authToken.substring(0, 20)}...`);

        console.log('\n🎯 Testing Trip Planning...');

        // Create a trip plan
        const tripPlanData = {
            name: 'Debug Test Trip',
            description: 'Debug test trip',
            event_id: 1,
            startDate: '2024-12-15',
            endDate: '2024-12-17',
            travelers: [{ name: 'Test User', email: testUser.email }],
            budget: 1500.00,
            preferences: {
                accommodation_type: 'hotel',
                transportation: 'flight'
            }
        };

        const tripPlanResponse = await axios.post(`${BASE_URL}/trip-planning/plans`, tripPlanData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const tripPlanId = tripPlanResponse.data.data.tripPlanId;
        console.log('✅ Trip plan created successfully');
        console.log(`   Trip Plan ID: ${tripPlanId}`);

        console.log('\n📋 Testing Booking Creation...');

        const bookingData = {
            tripId: tripPlanId,
            selections: [
                {
                    componentType: 'flight',
                    selectedOption: {
                        id: 'FLIGHT123',
                        provider: 'amadeus',
                        price: 450.00,
                        features: ['Standard'],
                        availability: 'available',
                        details: {
                            departure: 'JFK',
                            arrival: 'LAX',
                            departureTime: '10:00 AM',
                            arrivalTime: '1:00 PM'
                        }
                    }
                }
            ]
        };

        console.log('Sending booking data:', JSON.stringify(bookingData, null, 2));

        const bookingResponse = await axios.post(`${BASE_URL}/booking/trip-suggestion/${tripPlanId}`, bookingData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Booking created successfully');
        console.log('Response:', JSON.stringify(bookingResponse.data, null, 2));

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testDebug().catch(console.error); 