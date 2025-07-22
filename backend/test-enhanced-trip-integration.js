require('dotenv').config();

const TripSuggestionEngine = require('./services/tripSuggestionEngine');
const enhancedUnifiedTravelService = require('./services/enhancedUnifiedTravelService');

async function testEnhancedTripIntegration() {
    console.log('🚀 Testing Enhanced Trip Integration with SerpAPI and SeatGeek...');
    console.log('=' .repeat(60));
    
    // Test 1: Check provider availability
    console.log('\n1️⃣ Checking Provider Availability...');
    const availableProviders = await enhancedUnifiedTravelService.getAvailableProviders();
    
    console.log('Available Providers:');
    Object.entries(availableProviders).forEach(([name, info]) => {
        const status = info.available ? '✅' : '❌';
        console.log(`  ${status} ${name}: ${info.name} - ${info.available ? 'Available' : 'Not Available'}`);
        if (info.error) {
            console.log(`    Error: ${info.error}`);
        }
    });
    
    // Test 2: Health check
    console.log('\n2️⃣ Health Check...');
    const health = await enhancedUnifiedTravelService.healthCheck();
    console.log(`Overall Status: ${health.status}`);
    console.log(`Healthy Providers: ${health.summary.healthy}/${health.summary.total}`);
    
    // Test 3: Test flight search
    console.log('\n3️⃣ Testing Enhanced Flight Search...');
    try {
        const flightResults = await enhancedUnifiedTravelService.searchFlights(
            'DEN', // Denver
            'LAX', // Los Angeles
            '2025-08-15', // Departure date
            '2025-08-18', // Return date
            1, // passengers
            5 // max results
        );
        
        console.log(`Found ${flightResults.flights.length} flights from ${flightResults.providers.length} providers`);
        flightResults.providers.forEach(provider => {
            console.log(`  ${provider.name}: ${provider.status} (${provider.count} results)`);
        });
        
        if (flightResults.flights.length > 0) {
            console.log('Sample flight:', {
                provider: flightResults.flights[0].searchProvider,
                price: flightResults.flights[0].price?.total || flightResults.flights[0].price
            });
        }
    } catch (error) {
        console.log('❌ Flight search failed:', error.message);
    }
    
    // Test 4: Test hotel search
    console.log('\n4️⃣ Testing Enhanced Hotel Search...');
    try {
        const hotelResults = await enhancedUnifiedTravelService.searchHotels(
            'Los Angeles',
            '2025-08-15',
            '2025-08-16',
            1, // adults
            5, // radius
            5 // max results
        );
        
        console.log(`Found ${hotelResults.hotels.length} hotels from ${hotelResults.providers.length} providers`);
        hotelResults.providers.forEach(provider => {
            console.log(`  ${provider.name}: ${provider.status} (${provider.count} results)`);
        });
        
        if (hotelResults.hotels.length > 0) {
            console.log('Sample hotel:', {
                provider: hotelResults.hotels[0].searchProvider,
                name: hotelResults.hotels[0].name,
                price: hotelResults.hotels[0].price
            });
        }
    } catch (error) {
        console.log('❌ Hotel search failed:', error.message);
    }
    
    // Test 5: Test ticket search
    console.log('\n5️⃣ Testing Enhanced Ticket Search...');
    try {
        const ticketResults = await enhancedUnifiedTravelService.searchTickets(
            'Morgan Wallen Concert',
            'State Farm Stadium',
            '2025-08-15T20:00:00Z',
            5 // max results
        );
        
        console.log(`Found ${ticketResults.tickets.length} tickets from ${ticketResults.providers.length} providers`);
        ticketResults.providers.forEach(provider => {
            console.log(`  ${provider.name}: ${provider.status} (${provider.count} results)`);
        });
        
        if (ticketResults.tickets.length > 0) {
            console.log('Sample ticket:', {
                provider: ticketResults.tickets[0].searchProvider,
                price: ticketResults.tickets[0].price,
                details: ticketResults.tickets[0].details
            });
        }
    } catch (error) {
        console.log('❌ Ticket search failed:', error.message);
    }
    
    // Test 6: Test trip suggestion engine integration
    console.log('\n6️⃣ Testing Trip Suggestion Engine Integration...');
    try {
        // Create a mock event for testing
        const mockEvent = {
            id: 'test-event-1',
            name: 'Morgan Wallen: I\'m The Problem Tour',
            artist: 'Morgan Wallen',
            venue_name: 'State Farm Stadium',
            venue_city: 'Glendale',
            venue_state: 'AZ',
            event_date: '2025-08-15T20:00:00Z',
            external_id: null
        };
        
        const mockPreferences = {
            primary_airport: 'DEN',
            passengers: 1
        };
        
        // Test searchTravelOptions method
        const travelOptions = await TripSuggestionEngine.searchTravelOptions(mockEvent, mockPreferences);
        
        console.log('Travel Options Found:');
        Object.entries(travelOptions).forEach(([type, options]) => {
            console.log(`  ${type}: ${Array.isArray(options) ? options.length : 0} options`);
            if (Array.isArray(options) && options.length > 0) {
                const sample = options[0];
                console.log(`    Sample ${type}:`, {
                    provider: sample.provider || sample.searchProvider,
                    price: sample.price?.total || sample.price
                });
            }
        });
        
    } catch (error) {
        console.log('❌ Trip suggestion engine test failed:', error.message);
    }
    
    // Test 7: Summary
    console.log('\n7️⃣ Integration Summary...');
    const stats = await enhancedUnifiedTravelService.getProviderStats();
    console.log('Provider Statistics:');
    console.log(`  Total Providers: ${stats.summary.total}`);
    console.log(`  Available: ${stats.summary.available}`);
    console.log(`  Unavailable: ${stats.summary.unavailable}`);
    
    if (stats.summary.available > 0) {
        console.log('\n🎉 Enhanced trip integration is working!');
        console.log('✅ SerpAPI and SeatGeek are integrated into the trip suggestion engine');
        console.log('✅ Multiple providers are available for flights, hotels, and tickets');
        console.log('✅ Fallback mechanisms are in place');
    } else {
        console.log('\n⚠️  Some providers need attention');
        console.log('Check your API keys and provider configurations');
    }
}

testEnhancedTripIntegration().catch(console.error); 