const axios = require('axios');

const BACKEND_URL = 'http://localhost:5001/api';

// Test data
const testUser = {
    email: `debug-${Date.now()}@example.com`,
    password: 'TestPassword123',
    phone: '555-123-4567'
};

async function debugBooking() {
    try {
        console.log('🔍 Debugging Booking Process...\n');

        // 1. Register user
        console.log('1. Registering user...');
        const registerResponse = await axios.post(`${BACKEND_URL}/auth/register`, testUser);
        const userId = registerResponse.data.data.user.id;
        console.log('   User ID:', userId);

        // 2. Login user
        console.log('\n2. Logging in user...');
        const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        const authToken = loginResponse.data.data.token;
        console.log('   Token:', authToken.substring(0, 20) + '...');

        // 3. Create trip plan
        console.log('\n3. Creating trip plan...');
        const tripPlanData = {
            name: 'Debug Trip',
            description: 'Debug trip',
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
        console.log('   Trip Plan ID:', tripPlanId);

        // 4. Create booking
        console.log('\n4. Creating booking...');
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

        const bookingResponse = await axios.post(`${BACKEND_URL}/booking/trip-suggestion/${tripPlanId}`, bookingData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const bookingId = bookingResponse.data.data.bookingId;
        console.log('   Booking ID:', bookingId);

        // 5. Check database directly
        console.log('\n5. Checking database directly...');
        const { Pool } = require('pg');
        const pool = new Pool({
            host: 'localhost',
            port: 5433,
            database: 'concert_travel',
            user: 'postgres',
            password: 'password'
        });

        // Check trip_suggestions table
        const tripQuery = 'SELECT id, user_id, booking_id, booking_status FROM trip_suggestions WHERE booking_id = $1';
        const tripResult = await pool.query(tripQuery, [bookingId]);
        console.log('   Trip Suggestion Record:', tripResult.rows[0]);

        // Check trip_components table
        const componentQuery = 'SELECT * FROM trip_components WHERE trip_suggestion_id = $1';
        const componentResult = await pool.query(componentQuery, [tripResult.rows[0]?.id]);
        console.log('   Trip Components:', componentResult.rows);

        await pool.end();

        // 6. Try to get booking status
        console.log('\n6. Getting booking status...');
        try {
            const statusResponse = await axios.get(`${BACKEND_URL}/booking/status/${bookingId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log('   Status Response:', statusResponse.data);
        } catch (error) {
            console.log('   Status Error:', error.response?.data);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

debugBooking(); 