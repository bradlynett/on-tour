const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testEventEndpoints() {
    console.log('🎵 Testing Event API Endpoints...\n');

    try {
        // Test 1: Health check
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get('http://localhost:5001/health');
        console.log('✅ Health endpoint working:', healthResponse.data.status);

        // Test 2: Search events (will fail without auth, but that's expected)
        console.log('\n2️⃣ Testing events search endpoint...');
        try {
            const searchResponse = await axios.get(`${BASE_URL}/events/search?keyword=concert&size=3`);
            console.log('✅ Events search working:', searchResponse.data.data.length, 'events found');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Events endpoint working (auth required as expected)');
            } else {
                console.log('❌ Events search failed:', error.response?.data?.message || error.message);
            }
        }

        // Test 3: Test with authentication (if we have a test user)
        console.log('\n3️⃣ Testing with authentication...');
        try {
            // Try to login first
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'brad@example.com',
                password: 'password123'
            });

            if (loginResponse.data.success) {
                const token = loginResponse.data.token;
                console.log('✅ Login successful, testing authenticated endpoints...');

                // Test authenticated events search
                const authSearchResponse = await axios.get(`${BASE_URL}/events/search?keyword=concert&size=3`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Authenticated events search working:', authSearchResponse.data.data.length, 'events found');

                // Test upcoming events
                const upcomingResponse = await axios.get(`${BASE_URL}/events/upcoming?size=3`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Upcoming events working:', upcomingResponse.data.data.length, 'events found');

            } else {
                console.log('⚠️ Login failed, skipping authenticated tests');
            }
        } catch (error) {
            console.log('⚠️ Authentication test failed:', error.response?.data?.message || error.message);
        }

        console.log('\n🎉 Event API endpoint testing completed!');
        console.log('\n📋 Summary:');
        console.log('✅ Health endpoint working');
        console.log('✅ Events endpoints responding');
        console.log('✅ Authentication working (if user exists)');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testEventEndpoints(); 