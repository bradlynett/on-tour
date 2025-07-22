const enhancedUnifiedTravelService = require('./services/enhancedUnifiedTravelService');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');
const { logger } = require('./utils/logger');

async function testMultiProviderIntegration() {
    console.log('🔍 Testing Multi-Provider Integration and Data Prioritization');
    console.log('=' .repeat(80));

    try {
        // 1. Test Provider Availability
        console.log('\n1. Checking Provider Availability...');
        const availableProviders = await enhancedUnifiedTravelService.getAvailableProviders();
        
        console.log('Available Providers:');
        Object.entries(availableProviders).forEach(([name, info]) => {
            const status = info.available ? '✅' : '❌';
            console.log(`  ${status} ${name}: ${info.available ? 'Available' : 'Unavailable'}`);
            if (info.error) {
                console.log(`    Error: ${info.error}`);
            }
        });

        // 2. Test Enhanced Ticket Search with Multiple Providers
        console.log('\n2. Testing Enhanced Ticket Search...');
        const testEvent = {
            name: 'Taylor Swift',
            venue_name: 'MetLife Stadium',
            event_date: '2025-08-15T20:00:00Z'
        };

        console.log(`Searching tickets for: ${testEvent.name} at ${testEvent.venue_name}`);
        const ticketResults = await enhancedUnifiedTravelService.searchTickets(
            testEvent.name,
            testEvent.venue_name,
            testEvent.event_date,
            10
        );

        console.log(`\nTicket Search Results:`);
        console.log(`  Total tickets found: ${ticketResults.tickets.length}`);
        console.log(`  Providers used: ${ticketResults.providers.length}`);
        
        ticketResults.providers.forEach(provider => {
            const status = provider.status === 'success' ? '✅' : '❌';
            console.log(`  ${status} ${provider.name}: ${provider.count || 0} tickets`);
            if (provider.error) {
                console.log(`    Error: ${provider.error}`);
            }
        });

        // Show ticket details with provider info
        if (ticketResults.tickets.length > 0) {
            console.log('\nSample Tickets (showing provider and price info):');
            ticketResults.tickets.slice(0, 5).forEach((ticket, index) => {
                console.log(`  ${index + 1}. ${ticket.provider || ticket.searchProvider} - $${ticket.price || 'N/A'}`);
                console.log(`     URL: ${ticket.url ? 'Available' : 'Not available'}`);
                console.log(`     Details: ${ticket.details ? 'Available' : 'Not available'}`);
            });
        }

        // 3. Test Flight Search with Multiple Providers
        console.log('\n3. Testing Enhanced Flight Search...');
        const flightResults = await enhancedUnifiedTravelService.searchFlights(
            'DEN', // Denver
            'LAX', // Los Angeles
            '2025-08-15',
            '2025-08-20',
            1,
            10
        );

        console.log(`\nFlight Search Results:`);
        console.log(`  Total flights found: ${flightResults.flights.length}`);
        console.log(`  Providers used: ${flightResults.providers.length}`);
        
        flightResults.providers.forEach(provider => {
            const status = provider.status === 'success' ? '✅' : '❌';
            console.log(`  ${status} ${provider.name}: ${provider.count || 0} flights`);
            if (provider.error) {
                console.log(`    Error: ${provider.error}`);
            }
        });

        // Show flight details with provider info
        if (flightResults.flights.length > 0) {
            console.log('\nSample Flights (showing provider and price info):');
            flightResults.flights.slice(0, 5).forEach((flight, index) => {
                const price = flight.price?.total || flight.price || 'N/A';
                console.log(`  ${index + 1}. ${flight.searchProvider} - $${price}`);
                console.log(`     ${flight.origin} → ${flight.destination}`);
                console.log(`     Airline: ${flight.airline || 'N/A'}`);
            });
        }

        // 4. Test Hotel Search with Multiple Providers
        console.log('\n4. Testing Enhanced Hotel Search...');
        const hotelResults = await enhancedUnifiedTravelService.searchHotels(
            'LAX', // Los Angeles
            '2025-08-15',
            '2025-08-20',
            1,
            5,
            10
        );

        console.log(`\nHotel Search Results:`);
        console.log(`  Total hotels found: ${hotelResults.hotels.length}`);
        console.log(`  Providers used: ${hotelResults.providers.length}`);
        
        hotelResults.providers.forEach(provider => {
            const status = provider.status === 'success' ? '✅' : '❌';
            console.log(`  ${status} ${provider.name}: ${provider.count || 0} hotels`);
            if (provider.error) {
                console.log(`    Error: ${provider.error}`);
            }
        });

        // Show hotel details with provider info
        if (hotelResults.hotels.length > 0) {
            console.log('\nSample Hotels (showing provider and price info):');
            hotelResults.hotels.slice(0, 5).forEach((hotel, index) => {
                const price = hotel.price?.total || hotel.price || 'N/A';
                console.log(`  ${index + 1}. ${hotel.searchProvider} - $${price}/night`);
                console.log(`     ${hotel.name || hotel.hotelName || 'N/A'}`);
                console.log(`     Rating: ${hotel.rating || 'N/A'}`);
            });
        }

        // 5. Test Trip Suggestion Engine Integration
        console.log('\n5. Testing Trip Suggestion Engine Integration...');
        
        // Get a test user
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            console.log('❌ No users found in database. Skipping trip suggestion test.');
        } else {
            const testUserId = userResult.rows[0].id;
            console.log(`Testing with user ID: ${testUserId}`);

            // Generate a single trip suggestion to test provider integration
            const tripSuggestions = await tripSuggestionEngine.getEnhancedTripSuggestions(testUserId, 1);
            
            if (tripSuggestions.length > 0) {
                const trip = tripSuggestions[0];
                console.log(`\nTrip Suggestion Found:`);
                console.log(`  Event: ${trip.event_name}`);
                console.log(`  Venue: ${trip.venue_name}`);
                console.log(`  Date: ${trip.event_date}`);
                
                if (trip.components) {
                    console.log(`\nTrip Components:`);
                    Object.entries(trip.components).forEach(([type, components]) => {
                        if (components && components.length > 0) {
                            console.log(`  ${type.toUpperCase()}: ${components.length} options`);
                            components.slice(0, 2).forEach((comp, index) => {
                                const provider = comp.provider || comp.searchProvider || 'Unknown';
                                const price = comp.price || comp.price?.total || 'N/A';
                                const hasUrl = comp.url || comp.bookingUrl ? 'Yes' : 'No';
                                console.log(`    ${index + 1}. ${provider} - $${price} (URL: ${hasUrl})`);
                            });
                        } else {
                            console.log(`  ${type.toUpperCase()}: No options available`);
                        }
                    });
                }
            } else {
                console.log('❌ No trip suggestions found for test user');
            }
        }

        // 6. Test Provider Priority and Data Quality
        console.log('\n6. Testing Provider Priority and Data Quality...');
        
        // Check if we're getting the best data from multiple providers
        const hasMultipleProviders = ticketResults.providers.length > 1 || 
                                   flightResults.providers.length > 1 || 
                                   hotelResults.providers.length > 1;
        
        if (hasMultipleProviders) {
            console.log('✅ Multiple providers are being used');
            
            // Check if we're getting real data (not just mock data)
            const hasRealData = ticketResults.tickets.some(t => t.price && t.price > 0) ||
                              flightResults.flights.some(f => f.price && f.price > 0) ||
                              hotelResults.hotels.some(h => h.price && h.price > 0);
            
            if (hasRealData) {
                console.log('✅ Real pricing data is being returned');
            } else {
                console.log('⚠️  Only mock/estimated pricing data found');
            }
            
            // Check if we have booking URLs
            const hasBookingUrls = ticketResults.tickets.some(t => t.url) ||
                                 flightResults.flights.some(f => f.url) ||
                                 hotelResults.hotels.some(h => h.url);
            
            if (hasBookingUrls) {
                console.log('✅ Booking URLs are available');
            } else {
                console.log('⚠️  No booking URLs found');
            }
        } else {
            console.log('⚠️  Only single provider is being used');
        }

        // 7. Test Provider Fallback Logic
        console.log('\n7. Testing Provider Fallback Logic...');
        
        // Test with a preferred provider
        const preferredProviderResults = await enhancedUnifiedTravelService.searchTickets(
            testEvent.name,
            testEvent.venue_name,
            testEvent.event_date,
            5,
            'seatgeek' // Prefer SeatGeek
        );
        
        console.log(`Preferred provider (SeatGeek) results: ${preferredProviderResults.tickets.length} tickets`);
        console.log(`Providers used: ${preferredProviderResults.providers.map(p => p.name).join(', ')}`);

        // 8. Summary and Recommendations
        console.log('\n8. Integration Summary and Recommendations...');
        console.log('=' .repeat(80));
        
        const summary = {
            totalProviders: Object.keys(availableProviders).length,
            availableProviders: Object.values(availableProviders).filter(p => p.available).length,
            ticketProviders: ticketResults.providers.length,
            flightProviders: flightResults.providers.length,
            hotelProviders: hotelResults.providers.length,
            hasRealData: ticketResults.tickets.some(t => t.price && t.price > 0) ||
                        flightResults.flights.some(f => f.price && f.price > 0) ||
                        hotelResults.hotels.some(h => h.price && h.price > 0),
            hasBookingUrls: ticketResults.tickets.some(t => t.url) ||
                           flightResults.flights.some(f => f.url) ||
                           hotelResults.hotels.some(h => h.url)
        };
        
        console.log('Integration Status:');
        console.log(`  Total providers configured: ${summary.totalProviders}`);
        console.log(`  Available providers: ${summary.availableProviders}`);
        console.log(`  Ticket providers used: ${summary.ticketProviders}`);
        console.log(`  Flight providers used: ${summary.flightProviders}`);
        console.log(`  Hotel providers used: ${summary.hotelProviders}`);
        console.log(`  Real pricing data: ${summary.hasRealData ? '✅ Yes' : '❌ No'}`);
        console.log(`  Booking URLs available: ${summary.hasBookingUrls ? '✅ Yes' : '❌ No'}`);
        
        // Recommendations
        console.log('\nRecommendations:');
        if (summary.availableProviders < summary.totalProviders) {
            console.log('⚠️  Some providers are not available. Check API credentials.');
        }
        
        if (!summary.hasRealData) {
            console.log('⚠️  Consider adding more real data providers or fixing API integrations.');
        }
        
        if (!summary.hasBookingUrls) {
            console.log('⚠️  Booking URLs are missing. This affects user experience.');
        }
        
        if (summary.ticketProviders < 2) {
            console.log('⚠️  Consider adding more ticket providers for better coverage.');
        }
        
        console.log('\n✅ Multi-provider integration test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        logger.error('Multi-provider integration test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testMultiProviderIntegration(); 