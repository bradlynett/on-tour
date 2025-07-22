const axios = require('axios');
const { redisClient } = require('./redisClient');

// Load environment variables at the top
require('dotenv').config();

async function testSerpAPIFresh() {
    console.log('🔧 Testing SerpAPI Fresh (No Cache)');
    console.log('=' .repeat(60));

    try {
        // Clear SerpAPI cache
        console.log('\n1. Clearing SerpAPI cache...');
        const keys = await redisClient.keys('serpapi_*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`✅ Cleared ${keys.length} cached SerpAPI results`);
        } else {
            console.log('✅ No cached SerpAPI results found');
        }

        // Test basic connectivity
        console.log('\n2. Testing basic connectivity...');
        const apiKey = process.env.SERPAPI_KEY;
        console.log('SERPAPI_KEY loaded:', apiKey ? 'Yes' : 'No');
        
        if (!apiKey) {
            console.log('❌ SERPAPI_KEY not found');
            return;
        }

        // Test Google Flights with correct parameters
        console.log('\n3. Testing Google Flights (One-way)...');
        
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
                    
                    if (flightResponse.data.flight_results.length > 0) {
                        const flight = flightResponse.data.flight_results[0];
                        console.log('Sample flight:');
                        console.log(`  Airline: ${flight.airline || 'N/A'}`);
                        console.log(`  Price: ${flight.price || 'N/A'}`);
                        console.log(`  Duration: ${flight.duration || 'N/A'}`);
                    }
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

        // Test Google Hotels
        console.log('\n4. Testing Google Hotels...');
        
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
                    
                    if (hotelResponse.data.hotels_results.length > 0) {
                        const hotel = hotelResponse.data.hotels_results[0];
                        console.log('Sample hotel:');
                        console.log(`  Name: ${hotel.name || 'N/A'}`);
                        console.log(`  Price: ${hotel.price || 'N/A'}`);
                        console.log(`  Rating: ${hotel.rating || 'N/A'}`);
                    }
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

        // Test the provider class
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

        console.log('\n6. SerpAPI Fresh Test Summary...');
        console.log('=' .repeat(60));
        console.log('✅ SerpAPI fresh test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await redisClient.quit();
    }
}

// Run the test
testSerpAPIFresh(); 