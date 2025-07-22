const axios = require('axios');

async function testApiWithDeepLinks() {
  try {
    console.log('🔧 Testing API endpoint with deep linking data...');
    
    // First, get auth token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'brad@lynett.com',
      password: 'TestPassword1'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test trips endpoint
    const tripsResponse = await axios.get('http://localhost:3001/api/trips', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (tripsResponse.data.success) {
      console.log('✅ Trips API call successful');
      const trips = tripsResponse.data.suggestions || [];
      console.log(`   Found ${trips.length} trips`);
      
      // Show details of first trip
      if (trips.length > 0) {
        const trip = trips[0];
        console.log('\n📋 Sample Trip Details:');
        console.log(`   Event: ${trip.eventName} - ${trip.artist}`);
        console.log(`   Venue: ${trip.venueName}, ${trip.venueCity}, ${trip.venueState}`);
        console.log(`   Total Cost: $${trip.totalCost || 0}`);
        console.log(`   Service Fee: $${trip.serviceFee || 0}`);
        console.log(`   Components: ${trip.components?.length || 0}`);
        
        if (trip.priceBreakdown) {
          console.log(`   Price Breakdown: Real $${trip.priceBreakdown.real || 0}, Estimated $${trip.priceBreakdown.estimated || 0}`);
        }
        
        if (trip.components) {
          console.log('\n🔗 Components with Deep Links:');
          trip.components.forEach((comp, index) => {
            console.log(`   ${index + 1}. ${comp.componentType.toUpperCase()}`);
            console.log(`      Provider: ${comp.provider}`);
            console.log(`      Price: $${comp.price || 0} (${comp.priceType || 'unknown'})`);
            console.log(`      Booking URL: ${comp.bookingUrl ? '✅ Available' : '❌ Not available'}`);
            if (comp.bookingUrl) {
              console.log(`      URL: ${comp.bookingUrl}`);
            }
          });
        }
        
        if (trip.bookingUrls) {
          console.log('\n🔗 Quick Booking URLs:');
          Object.entries(trip.bookingUrls).forEach(([type, url]) => {
            console.log(`   ${type}: ${url}`);
          });
        }
      }
      
    } else {
      console.log('❌ Trips API call failed:', tripsResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testApiWithDeepLinks(); 