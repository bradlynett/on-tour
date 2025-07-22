// Frontend-Backend Booking Integration Test
// This script tests the complete booking flow from frontend to backend

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5001/api';

// Test data
const testUser = {
    email: `test-integration-${Date.now()}@example.com`,
    password: 'TestPassword123',
    phone: '555-123-4567'
};

async function testBookingIntegration() {
    console.log('🚀 Starting Frontend-Backend Booking Integration Test\n');

    try {
        // Step 1: Test Backend Health
        console.log('1️⃣ Testing Backend Health...');
        const healthResponse = await axios.get(`${BACKEND_URL.replace('/api', '')}/health`);
        console.log('✅ Backend is healthy:', healthResponse.data.status);

        // Step 2: Test Frontend Accessibility
        console.log('\n2️⃣ Testing Frontend Accessibility...');
        const frontendResponse = await axios.get(FRONTEND_URL);
        console.log('✅ Frontend is accessible (Status:', frontendResponse.status, ')');

        // Step 3: User Registration
        console.log('\n3️⃣ Testing User Registration...');
        const registerResponse = await axios.post(`${BACKEND_URL}/auth/register`, testUser);
        console.log('✅ User registration successful');
        console.log('   User ID:', registerResponse.data.data.user.id);

        // Step 4: User Login
        console.log('\n4️⃣ Testing User Login...');
        const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        const authToken = loginResponse.data.data.token;
        const testUserId = loginResponse.data.data.user.id;
        console.log('✅ User login successful');
        console.log('   Token:', authToken.substring(0, 20) + '...');

        // Step 5: Create Trip Plan
        console.log('\n5️⃣ Testing Trip Plan Creation...');
        const tripPlanData = {
            name: 'Integration Test Trip',
            description: 'Test trip for booking integration',
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

        const tripPlanResponse = await axios.post(`${BACKEND_URL}/trip-planning/plans`, tripPlanData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const tripPlanId = tripPlanResponse.data.data.tripPlanId;
        console.log('✅ Trip plan created successfully');
        console.log('   Trip Plan ID:', tripPlanId);

        // Step 6: Test Booking Creation
        console.log('\n6️⃣ Testing Booking Creation...');
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
                },
                {
                    componentType: 'hotel',
                    selectedOption: {
                        id: 'HOTEL456',
                        provider: 'booking',
                        price: 200.00,
                        features: ['Free WiFi', 'Pool'],
                        availability: 'available',
                        details: {
                            name: 'Test Hotel',
                            roomType: 'Standard Room'
                        }
                    }
                }
            ]
        };

        const bookingResponse = await axios.post(`${BACKEND_URL}/booking/trip-suggestion/${tripPlanId}`, bookingData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Booking created successfully');
        console.log('   Booking ID:', bookingResponse.data.data.bookingId);
        console.log('   Status:', bookingResponse.data.data.status);
        console.log('   Components:', bookingResponse.data.data.components);
        console.log('   Total Cost:', bookingResponse.data.data.totalCost);

        // Step 7: Test Booking Status
        console.log('\n7️⃣ Testing Booking Status...');
        const bookingId = bookingResponse.data.data.bookingId;
        
        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(`${BACKEND_URL}/booking/status/${bookingId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Booking status retrieved');
        console.log('   Final Status:', statusResponse.data.data.status);
        console.log('   Components:', statusResponse.data.data.components.length);
        console.log('   Failed:', statusResponse.data.data.failed.length);

        // Step 8: Test User Bookings History
        console.log('\n8️⃣ Testing Booking History...');
        const historyResponse = await axios.get(`${BACKEND_URL}/booking/history`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { limit: 5, offset: 0 }
        });

        console.log('✅ Booking history retrieved');
        console.log('   Total Bookings:', historyResponse.data.data.bookings.length);

        // Step 9: Test Booking Analytics
        console.log('\n9️⃣ Testing Booking Analytics...');
        const analyticsResponse = await axios.get(`${BACKEND_URL}/booking/analytics`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Booking analytics retrieved');
        console.log('   Total Bookings:', analyticsResponse.data.data.total_bookings);
        console.log('   Successful:', analyticsResponse.data.data.successful_bookings);

        console.log('\n🎉 All Integration Tests Passed!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Backend API: Working');
        console.log('   ✅ Frontend: Accessible');
        console.log('   ✅ Authentication: Working');
        console.log('   ✅ Trip Planning: Working');
        console.log('   ✅ Booking Creation: Working');
        console.log('   ✅ Booking Status: Working');
        console.log('   ✅ Booking History: Working');
        console.log('   ✅ Booking Analytics: Working');
        
        console.log('\n🚀 The booking system is fully integrated and ready for use!');
        console.log('\n🌐 You can now:');
        console.log('   1. Visit http://localhost:3000');
        console.log('   2. Register/Login');
        console.log('   3. Go to /trips to see trip suggestions');
        console.log('   4. Click "Customize & Book" to test the booking flow');

    } catch (error) {
        console.error('\n❌ Integration Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testBookingIntegration().catch(console.error); 