const axios = require('axios');
const { redisClient } = require('./redisClient');

// Load environment variables at the top
require('dotenv').config();

async function testSerpAPIFix() {
    console.log('🔧 Testing and Fixing SerpAPI Configuration');
    console.log('=' .repeat(80));

    try {
        // 1. Check environment variables
        console.log('\n1. Checking SerpAPI Environment Variables...');
        const apiKey = process.env.SERPAPI_KEY;
        
        if (!apiKey) {
            console.log('❌ SERPAPI_KEY not found in environment variables');
            console.log('Please add SERPAPI_KEY to your .env file');
            return;
        }
        
        console.log('✅ SERPAPI_KEY found in environment variables');
        console.log(`Key length: ${apiKey.length} characters`);
        console.log(`Key starts with: ${apiKey.substring(0, 4)}...`);

        // 2. Test basic SerpAPI connectivity
        console.log('\n2. Testing Basic SerpAPI Connectivity...');
        
        // Test with a simple search that should work
        const testParams = {
            engine: 'google',
            api_key: apiKey,
            q: 'test search',
            hl: 'en'
        };

        try {
            const response = await axios.get('https://serpapi.com/search', { 
                params: testParams,
                timeout: 10000 
            });
            
            if (response.status === 200) {
                console.log('✅ Basic SerpAPI connectivity successful');
                console.log(`Response status: ${response.status}`);
            } else {
                console.log(`⚠️  Unexpected response status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Basic connectivity test failed: ${error.message}`);
            if (error.response) {
                console.log(`Response status: ${error.response.status}`);
                console.log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }

        // 3. Test Google Flights with valid parameters
        console.log('\n3. Testing Google Flights Search...');
        
        const flightParams = {
            engine: 'google_flights',
            api_key: apiKey,
            departure_id: 'DEN',
            arrival_id: 'LAX',
            outbound_date: '2025-08-15',
            adults: '1',
            currency: 'USD',
            hl: 'en'
        };

        try {
            const flightResponse = await axios.get('https://serpapi.com/search', { 
                params: flightParams,
                timeout: 15000 
            });
            
            if (flightResponse.status === 200) {
                console.log('✅ Google Flights search successful');
                if (flightResponse.data && flightResponse.data.flight_results) {
                    console.log(`Found ${flightResponse.data.flight_results.length} flight results`);
                } else {
                    console.log('No flight results in response');
                }
            }
        } catch (error) {
            console.log(`❌ Google Flights test failed: ${error.message}`);
            if (error.response) {
                console.log(`Response status: ${error.response.status}`);
                console.log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }

        // 4. Test Google Hotels with valid parameters
        console.log('\n4. Testing Google Hotels Search...');
        
        const hotelParams = {
            engine: 'google_hotels',
            api_key: apiKey,
            q: 'hotels in Los Angeles',
            check_in_date: '2025-08-15',
            check_out_date: '2025-08-20',
            adults: '1',
            currency: 'USD',
            hl: 'en'
        };

        try {
            const hotelResponse = await axios.get('https://serpapi.com/search', { 
                params: hotelParams,
                timeout: 15000 
            });
            
            if (hotelResponse.status === 200) {
                console.log('✅ Google Hotels search successful');
                if (hotelResponse.data && hotelResponse.data.hotels_results) {
                    console.log(`Found ${hotelResponse.data.hotels_results.length} hotel results`);
                } else {
                    console.log('No hotel results in response');
                }
            }
        } catch (error) {
            console.log(`❌ Google Hotels test failed: ${error.message}`);
            if (error.response) {
                console.log(`Response status: ${error.response.status}`);
                console.log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }

        // 5. Test the SerpAPI Provider class
        console.log('\n5. Testing SerpAPI Provider Class...');
        
        const SerpAPIProvider = require('./services/providers/serpapiProvider');
        const serpapiProvider = new SerpAPIProvider();
        
        try {
            const isAvailable = await serpapiProvider.isAvailable();
            console.log(`Provider available: ${isAvailable}`);
            
            if (isAvailable) {
                const health = await serpapiProvider.healthCheck();
                console.log(`Health check: ${JSON.stringify(health, null, 2)}`);
            }
        } catch (error) {
            console.log(`❌ Provider test failed: ${error.message}`);
        }

        // 6. Test flight search through provider
        console.log('\n6. Testing Flight Search Through Provider...');
        
        try {
            const flights = await serpapiProvider.searchFlights(
                'DEN',
                'LAX',
                '2025-08-15',
                '2025-08-20',
                1,
                5
            );
            
            console.log(`✅ Flight search successful: ${flights.length} flights found`);
            if (flights.length > 0) {
                console.log('Sample flight:');
                console.log(`  Airline: ${flights[0].airline || 'N/A'}`);
                console.log(`  Price: $${flights[0].price || 'N/A'}`);
                console.log(`  Duration: ${flights[0].duration || 'N/A'}`);
            }
        } catch (error) {
            console.log(`❌ Flight search failed: ${error.message}`);
        }

        // 7. Test hotel search through provider
        console.log('\n7. Testing Hotel Search Through Provider...');
        
        try {
            const hotels = await serpapiProvider.searchHotels(
                'LAX',
                '2025-08-15',
                '2025-08-20',
                1,
                5,
                5
            );
            
            console.log(`✅ Hotel search successful: ${hotels.length} hotels found`);
            if (hotels.length > 0) {
                console.log('Sample hotel:');
                console.log(`  Name: ${hotels[0].name || 'N/A'}`);
                console.log(`  Price: $${hotels[0].price || 'N/A'}`);
                console.log(`  Rating: ${hotels[0].rating || 'N/A'}`);
            }
        } catch (error) {
            console.log(`❌ Hotel search failed: ${error.message}`);
        }

        // 8. Summary and Recommendations
        console.log('\n8. SerpAPI Fix Summary...');
        console.log('=' .repeat(80));
        
        console.log('✅ SerpAPI configuration test completed!');
        console.log('\nIf you see errors above, here are common fixes:');
        console.log('1. Verify your SERPAPI_KEY is valid and active');
        console.log('2. Check your SerpAPI account balance/credits');
        console.log('3. Ensure the API key has access to Google Flights and Hotels');
        console.log('4. Check if there are any rate limits or restrictions');
        
        console.log('\nNext steps:');
        console.log('1. Fix any SerpAPI errors identified above');
        console.log('2. Run this test again to verify fixes');
        console.log('3. Generate new trip suggestions to test the updated priority');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await redisClient.quit();
    }
}

// Run the test
testSerpAPIFix(); 