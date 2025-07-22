const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TEST_USER = {
    email: 'john.doe@example.com',
    password: 'password'
};

let authToken = null;

async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
        authToken = response.data.data.token;
        console.log('✅ Login successful');
        return authToken;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testTripEndpoints() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };

    console.log('\n🎯 Testing Trip Suggestions Endpoints');
    console.log('=====================================');

    try {
        // Test 1: Get all trip suggestions
        console.log('\n1. Getting all trip suggestions...');
        const suggestionsResponse = await axios.get(`${BASE_URL}/trips`, { headers });
        console.log(`✅ Found ${suggestionsResponse.data.data.suggestions.length} trip suggestions`);
        
        if (suggestionsResponse.data.data.suggestions.length > 0) {
            const firstSuggestion = suggestionsResponse.data.data.suggestions[0];
            console.log(`   First suggestion: ${firstSuggestion.event_name} - $${firstSuggestion.total_cost}`);
        }

        // Test 2: Get trip statistics
        console.log('\n2. Getting trip statistics...');
        const statsResponse = await axios.get(`${BASE_URL}/trips/stats/overview`, { headers });
        const stats = statsResponse.data.data.statistics;
        console.log('✅ Trip Statistics:');
        console.log(`   - Total Suggestions: ${stats.total_suggestions}`);
        console.log(`   - Pending: ${stats.pending_suggestions}`);
        console.log(`   - Approved: ${stats.approved_suggestions}`);
        console.log(`   - Booked: ${stats.booked_suggestions}`);
        console.log(`   - Average Cost: $${parseFloat(stats.avg_total_cost || 0).toFixed(2)}`);

        // Test 3: Generate new trip suggestions
        console.log('\n3. Generating new trip suggestions...');
        const generateResponse = await axios.post(`${BASE_URL}/trips/generate`, { limit: 2 }, { headers });
        console.log(`✅ Generated ${generateResponse.data.data.suggestions.length} new trip suggestions`);
        
        generateResponse.data.data.suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion.eventName} - $${suggestion.totalCost}`);
        });

        // Test 4: Get specific trip suggestion (if we have one)
        if (suggestionsResponse.data.data.suggestions.length > 0) {
            const suggestionId = suggestionsResponse.data.data.suggestions[0].id;
            console.log(`\n4. Getting specific trip suggestion (ID: ${suggestionId})...`);
            const specificResponse = await axios.get(`${BASE_URL}/trips/${suggestionId}`, { headers });
            console.log('✅ Retrieved specific trip suggestion');
            console.log(`   Event: ${specificResponse.data.data.suggestion.eventName}`);
            console.log(`   Status: ${specificResponse.data.data.suggestion.status}`);
        }

        // Test 5: Update trip suggestion status (if we have one)
        if (suggestionsResponse.data.data.suggestions.length > 0) {
            const suggestionId = suggestionsResponse.data.data.suggestions[0].id;
            console.log(`\n5. Updating trip suggestion status (ID: ${suggestionId})...`);
            const updateResponse = await axios.patch(
                `${BASE_URL}/trips/${suggestionId}/status`,
                { status: 'approved' },
                { headers }
            );
            console.log('✅ Updated trip suggestion status');
            console.log(`   New Status: ${updateResponse.data.data.suggestion.status}`);
        }

        // Test 6: Get available events for creating specific trip
        console.log('\n6. Getting available events...');
        const eventsResponse = await axios.get(`${BASE_URL}/events`, { headers });
        console.log(`✅ Found ${eventsResponse.data.data.events.length} events`);

        // Test 7: Create trip suggestion for specific event (if we have events)
        if (eventsResponse.data.data.events.length > 0) {
            const eventId = eventsResponse.data.data.events[0].id;
            console.log(`\n7. Creating trip suggestion for specific event (ID: ${eventId})...`);
            const createResponse = await axios.post(`${BASE_URL}/trips/event/${eventId}`, {}, { headers });
            console.log('✅ Created trip suggestion for specific event');
            console.log(`   Total Cost: $${createResponse.data.data.suggestion.totalCost}`);
            console.log(`   Components: ${createResponse.data.data.suggestion.components.length}`);
        }

        console.log('\n🎉 All trip suggestion endpoints are working!');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.data?.error) {
            console.error('Error details:', error.response.data.error);
        }
    }
}

async function runTests() {
    try {
        await login();
        await testTripEndpoints();
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests(); 