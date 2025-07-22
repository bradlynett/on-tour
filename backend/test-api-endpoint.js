const axios = require('axios');

async function testApiEndpoint() {
  try {
    console.log('🧪 Testing API endpoint with refresh functionality...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'brad@lynett.com',
      password: 'TestPassword1'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test the trips endpoint (this should trigger refresh)
    const tripsResponse = await axios.get('http://localhost:3001/api/trips', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Trips API call successful');
    console.log(`Found ${tripsResponse.data.data.suggestions.length} trips`);
    
    tripsResponse.data.data.suggestions.forEach((trip, index) => {
      console.log(`\n📅 Trip ${index + 1}: ${trip.eventName}`);
      console.log(`   Total Cost: $${trip.totalCost || 0}`);
      console.log(`   Service Fee: $${trip.serviceFee || 0}`);
      console.log(`   Components: ${trip.components?.length || 0}`);
      
      if (trip.components) {
        trip.components.forEach(comp => {
          const price = comp.price || comp.enrichedDetails?.price || 'N/A';
          const provider = comp.provider || comp.enrichedDetails?.provider || 'Unknown';
          console.log(`   - ${comp.componentType}: $${price} (${provider})`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.response?.data || error.message);
  }
}

testApiEndpoint(); 