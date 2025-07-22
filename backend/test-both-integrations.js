require('dotenv').config();

const SerpAPIProvider = require('./services/providers/serpapiProvider');

async function testBothIntegrations() {
    console.log('🚀 Testing SerpAPI and SeatGeek Integrations...');
    console.log('=' .repeat(60));
    
    // Test 1: Environment Variables
    console.log('\n1️⃣ Checking Environment Variables...');
    console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? '✅ Found' : '❌ Not found');
    console.log('SEATGEEK_CLIENT_ID:', process.env.SEATGEEK_CLIENT_ID ? '✅ Found' : '❌ Not found');
    console.log('SEATGEEK_CLIENT_SECRET:', process.env.SEATGEEK_CLIENT_SECRET ? '✅ Found' : '❌ Not found');
    
    if (!process.env.SERPAPI_KEY) {
        console.log('❌ SerpAPI key not found - please check your .env file');
        return;
    }
    
    if (!process.env.SEATGEEK_CLIENT_ID || !process.env.SEATGEEK_CLIENT_SECRET) {
        console.log('❌ SeatGeek credentials not found - please check your .env file');
        return;
    }
    
    // Test 2: SerpAPI Integration
    console.log('\n2️⃣ Testing SerpAPI Integration...');
    const serpapi = new SerpAPIProvider();
    
    try {
        // Test SerpAPI availability
        const isAvailable = await serpapi.isAvailable();
        console.log('   SerpAPI Available:', isAvailable ? '✅ Yes' : '❌ No');
        
        if (isAvailable) {
            // Test Google Flights
            console.log('   Testing Google Flights: DEN → LAX (Aug 15, 2025)');
            const flights = await serpapi.searchFlights('DEN', 'LAX', '2025-08-15', null, 1, 2);
            
            if (flights && flights.length > 0) {
                console.log(`   ✅ Found ${flights.length} flights via SerpAPI`);
                flights.forEach((flight, index) => {
                    console.log(`      Flight ${index + 1}: ${flight.airline} - $${flight.price?.total || 'N/A'}`);
                });
            } else {
                console.log('   ⚠️  No flights found via SerpAPI');
            }
            
            // Test Google Hotels
            console.log('   Testing Google Hotels: Los Angeles (Aug 15-18, 2025)');
            const hotels = await serpapi.searchHotels('Los Angeles', '2025-08-15', '2025-08-18', 1, 5, 2);
            
            if (hotels && hotels.length > 0) {
                console.log(`   ✅ Found ${hotels.length} hotels via SerpAPI`);
                hotels.forEach((hotel, index) => {
                    console.log(`      Hotel ${index + 1}: ${hotel.name} - $${hotel.offers?.[0]?.price?.total || 'N/A'}`);
                });
            } else {
                console.log('   ⚠️  No hotels found via SerpAPI');
            }
        }
    } catch (error) {
        console.log(`   ❌ SerpAPI test failed: ${error.message}`);
    }
    
    // Test 3: SeatGeek Integration
    console.log('\n3️⃣ Testing SeatGeek Integration...');
    try {
        const axios = require('axios');
        
        // Test SeatGeek API with client credentials
        const seatgeekAuth = Buffer.from(`${process.env.SEATGEEK_CLIENT_ID}:${process.env.SEATGEEK_CLIENT_SECRET}`).toString('base64');
        
        console.log('   Testing SeatGeek API access...');
        
        // Test basic API call (events search)
        const seatgeekResponse = await axios.get('https://api.seatgeek.com/2/events', {
            headers: {
                'Authorization': `Basic ${seatgeekAuth}`,
                'Content-Type': 'application/json'
            },
            params: {
                q: 'concert',
                per_page: 2,
                sort: 'score.desc'
            }
        });
        
        if (seatgeekResponse.data && seatgeekResponse.data.events) {
            console.log(`   ✅ Found ${seatgeekResponse.data.events.length} events via SeatGeek`);
            seatgeekResponse.data.events.forEach((event, index) => {
                console.log(`      Event ${index + 1}: ${event.title} - ${event.venue?.name || 'N/A'}`);
                if (event.stats && event.stats.lowest_price) {
                    console.log(`         Lowest Price: $${event.stats.lowest_price}`);
                }
            });
        } else {
            console.log('   ⚠️  No events found via SeatGeek');
        }
        
    } catch (error) {
        console.log(`   ❌ SeatGeek test failed: ${error.message}`);
        if (error.response) {
            console.log(`      Status: ${error.response.status}`);
            console.log(`      Data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
        }
    }
    
    // Test 4: Integration Summary
    console.log('\n4️⃣ Integration Summary...');
    console.log('=' .repeat(40));
    
    const summary = {
        serpapi: {
            flights: flights && flights.length > 0 ? '✅ Working' : '❌ Failed',
            hotels: hotels && hotels.length > 0 ? '✅ Working' : '❌ Failed'
        },
        seatgeek: {
            events: seatgeekResponse && seatgeekResponse.data?.events ? '✅ Working' : '❌ Failed'
        }
    };
    
    console.log('SerpAPI:');
    console.log(`   Flights: ${summary.serpapi.flights}`);
    console.log(`   Hotels: ${summary.serpapi.hotels}`);
    console.log('SeatGeek:');
    console.log(`   Events: ${summary.seatgeek.events}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Integrate SerpAPI into trip suggestion engine');
    console.log('2. Create SeatGeek provider class');
    console.log('3. Update unified travel service');
    console.log('4. Test with real trip generation');
    
    console.log('\n✅ Integration Test Complete!');
}

testBothIntegrations().catch(console.error); 