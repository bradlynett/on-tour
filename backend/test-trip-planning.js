const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testTripPlanning() {
    try {
        console.log('🧪 Testing Trip Planning API...\n');
        
        // Test 1: Create a trip plan
        console.log('1. Testing create trip plan...');
        const createResponse = await axios.post(`${BASE_URL}/trip-planning/plans`, {
            name: 'Test Concert Trip',
            description: 'A test trip to see a concert',
            start_date: '2024-06-15',
            end_date: '2024-06-17',
            travelers: [{ name: 'Test User', email: 'test@example.com' }],
            budget: 1500.00,
            preferences: { preferred_airline: 'Delta', hotel_rating: 4 }
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Create trip plan response:', createResponse.data);
        const tripPlanId = createResponse.data.id;
        
        // Test 2: Get trip plan
        console.log('\n2. Testing get trip plan...');
        const getResponse = await axios.get(`${BASE_URL}/trip-planning/plans/${tripPlanId}`);
        console.log('✅ Get trip plan response:', getResponse.data);
        
        // Test 3: Add trip component
        console.log('\n3. Testing add trip component...');
        const componentResponse = await axios.post(`${BASE_URL}/trip-planning/plans/${tripPlanId}/components`, {
            type: 'flight',
            provider: 'amadeus',
            provider_id: 'FL123',
            details: {
                origin: 'LAX',
                destination: 'JFK',
                airline: 'Delta',
                flight_number: 'DL123'
            },
            price: 450.00,
            currency: 'USD'
        });
        
        console.log('✅ Add component response:', componentResponse.data);
        
        // Test 4: Get trip components
        console.log('\n4. Testing get trip components...');
        const componentsResponse = await axios.get(`${BASE_URL}/trip-planning/plans/${tripPlanId}/components`);
        console.log('✅ Get components response:', componentsResponse.data);
        
        // Test 5: Update trip plan
        console.log('\n5. Testing update trip plan...');
        const updateResponse = await axios.put(`${BASE_URL}/trip-planning/plans/${tripPlanId}`, {
            name: 'Updated Concert Trip',
            budget: 2000.00
        });
        
        console.log('✅ Update trip plan response:', updateResponse.data);
        
        console.log('\n🎉 All trip planning tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testTripPlanning(); 