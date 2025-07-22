const SerpAPIProvider = require('./services/providers/serpapiProvider');

async function testSerpAPIIntegration() {
    console.log('🚀 Testing SerpAPI Integration...');
    
    const serpapi = new SerpAPIProvider();
    
    // Test 1: Check API key and availability
    console.log('\n1️⃣ Testing API Key and Availability...');
    const isAvailable = await serpapi.isAvailable();
    console.log(`   API Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    
    if (!isAvailable) {
        console.log('   ❌ SerpAPI key not found in environment variables');
        console.log('   💡 Make sure SERPAPI_KEY is set in your .env file');
        return;
    }
    
    // Test 2: Health check
    console.log('\n2️⃣ Testing Health Check...');
    try {
        const health = await serpapi.healthCheck();
        console.log(`   Status: ${health.status}`);
        if (health.error) {
            console.log(`   Error: ${health.error}`);
        } else {
            console.log(`   Response Time: ${health.responseTime}`);
            console.log(`   Data Available: ${health.dataAvailable ? '✅ Yes' : '❌ No'}`);
        }
    } catch (error) {
        console.log(`   ❌ Health check failed: ${error.message}`);
    }
    
    // Test 3: Google Flights search
    console.log('\n3️⃣ Testing Google Flights Search...');
    try {
        console.log('   Searching: DEN → LAX (Aug 15, 2025)');
        const flights = await serpapi.searchFlights('DEN', 'LAX', '2025-08-15', null, 1, 3);
        
        if (flights && flights.length > 0) {
            console.log(`   ✅ Found ${flights.length} flights`);
            
            flights.forEach((flight, index) => {
                console.log(`   Flight ${index + 1}:`);
                console.log(`      Airline: ${flight.airline}`);
                console.log(`      Price: $${flight.price?.total || 'N/A'}`);
                console.log(`      Duration: ${flight.duration || 'N/A'}`);
                console.log(`      Stops: ${flight.stops || 0}`);
                console.log(`      Data Source: ${flight.dataSource}`);
            });
        } else {
            console.log('   ⚠️  No flights found');
        }
    } catch (error) {
        console.log(`   ❌ Flight search failed: ${error.message}`);
    }
    
    // Test 4: Google Hotels search
    console.log('\n4️⃣ Testing Google Hotels Search...');
    try {
        console.log('   Searching: Hotels in Los Angeles (Aug 15-18, 2025)');
        const hotels = await serpapi.searchHotels('Los Angeles', '2025-08-15', '2025-08-18', 1, 5, 3);
        
        if (hotels && hotels.length > 0) {
            console.log(`   ✅ Found ${hotels.length} hotels`);
            
            hotels.forEach((hotel, index) => {
                console.log(`   Hotel ${index + 1}:`);
                console.log(`      Name: ${hotel.name}`);
                console.log(`      Price: $${hotel.offers?.[0]?.price?.total || 'N/A'}`);
                console.log(`      Rating: ${hotel.rating || 'N/A'}`);
                console.log(`      Address: ${hotel.address || 'N/A'}`);
                console.log(`      Data Source: ${hotel.dataSource}`);
            });
        } else {
            console.log('   ⚠️  No hotels found');
        }
    } catch (error) {
        console.log(`   ❌ Hotel search failed: ${error.message}`);
    }
    
    // Test 5: Google Maps local search
    console.log('\n5️⃣ Testing Google Maps Local Search...');
    try {
        console.log('   Searching: Restaurants near Madison Square Garden');
        const places = await serpapi.searchLocalPlaces('restaurants near Madison Square Garden', '@40.7505,-73.9934,15z', 'search', 3);
        
        if (places && places.length > 0) {
            console.log(`   ✅ Found ${places.length} places`);
            
            places.forEach((place, index) => {
                console.log(`   Place ${index + 1}:`);
                console.log(`      Name: ${place.title}`);
                console.log(`      Rating: ${place.rating || 'N/A'}`);
                console.log(`      Address: ${place.address || 'N/A'}`);
                console.log(`      Data Source: ${place.dataSource}`);
            });
        } else {
            console.log('   ⚠️  No places found');
        }
    } catch (error) {
        console.log(`   ❌ Local search failed: ${error.message}`);
    }
    
    // Test 6: Pricing information
    console.log('\n6️⃣ Pricing Information...');
    const pricing = serpapi.getPricingInfo();
    console.log(`   Cost per search: $${pricing.costPerSearch}`);
    console.log(`   Currency: ${pricing.currency}`);
    console.log('   Plans:');
    Object.entries(pricing.plans).forEach(([plan, details]) => {
        console.log(`      ${plan}: ${details.searches} searches for $${details.cost}/month`);
    });
    
    console.log('\n🎯 SerpAPI Integration Test Complete!');
    console.log('=' .repeat(50));
}

testSerpAPIIntegration().catch(console.error); 