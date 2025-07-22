const axios = require('axios');

async function testAPIResponse() {
    console.log('🔍 Testing API Response for Frontend');
    console.log('=' .repeat(60));

    try {
        // Test the trips API endpoint
        console.log('\n1. Testing /api/trips endpoint...');
        
        const response = await axios.get('http://localhost:5001/api/trips', {
            headers: {
                'Authorization': 'Bearer test-token',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`✅ API Response Status: ${response.status}`);
        
        if (response.data && response.data.success) {
            const data = response.data.data;
            const suggestions = data.suggestions || [];
            
            console.log(`\n📊 API Response Summary:`);
            console.log(`  Success: ${response.data.success}`);
            console.log(`  Total suggestions: ${suggestions.length}`);
            
            if (suggestions.length > 0) {
                console.log(`\n📋 Trip Suggestions Details:`);
                
                for (let i = 0; i < Math.min(suggestions.length, 3); i++) {
                    const trip = suggestions[i];
                    console.log(`\n  Trip ${i + 1}:`);
                    console.log(`    ID: ${trip.id}`);
                    console.log(`    Event: ${trip.eventName}`);
                    console.log(`    Artist: ${trip.artist}`);
                    console.log(`    Total Cost: $${trip.totalCost || 0}`);
                    console.log(`    Service Fee: $${trip.serviceFee || 0}`);
                    console.log(`    Components: ${trip.components?.length || 0}`);
                    
                    if (trip.components && trip.components.length > 0) {
                        console.log(`    Component Details:`);
                        trip.components.forEach((comp, idx) => {
                            console.log(`      ${idx + 1}. ${comp.componentType}:`);
                            console.log(`         Provider: ${comp.provider || comp.searchProvider}`);
                            console.log(`         Price: $${comp.price || 0}`);
                            console.log(`         Booking URL: ${comp.bookingUrl || comp.booking_reference || 'N/A'}`);
                            console.log(`         Price Type: ${comp.priceType || 'unknown'}`);
                        });
                    } else {
                        console.log(`    ⚠️ No components available`);
                    }
                }
            } else {
                console.log(`\n⚠️ No trip suggestions returned`);
            }
            
            // Check for any mock data indicators
            console.log(`\n🔍 Mock Data Check:`);
            let mockDataFound = false;
            
            if (suggestions.length > 0) {
                for (const trip of suggestions) {
                    if (trip.components) {
                        for (const comp of trip.components) {
                            const provider = comp.provider || comp.searchProvider;
                            if (provider === 'skyscanner' || provider === 'bookingcom' || provider === 'agoda') {
                                console.log(`  ❌ Mock provider found: ${provider} in trip ${trip.id}`);
                                mockDataFound = true;
                            }
                        }
                    }
                }
            }
            
            if (!mockDataFound) {
                console.log(`  ✅ No mock providers detected`);
            }
            
        } else {
            console.log(`❌ API response format unexpected:`);
            console.log(JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error(`❌ API test failed: ${error.message}`);
        
        if (error.response) {
            console.log(`  Status: ${error.response.status}`);
            console.log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

// Run the test
testAPIResponse(); 