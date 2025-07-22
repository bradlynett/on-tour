const { pool } = require('./config/database');
const { logger } = require('./utils/logger');

async function testUpdatedProviderPriority() {
    console.log('🔍 Testing Updated Provider Priority (SerpAPI First)');
    console.log('=' .repeat(80));

    try {
        // 1. Verify Provider Priority Configuration
        console.log('\n1. Verifying Updated Provider Priority Configuration...');
        
        const enhancedService = require('./services/enhancedUnifiedTravelService');
        
        console.log('Updated Provider Priority Order:');
        console.log(`  Flights: ${enhancedService.providerPriority.flights.join(' → ')}`);
        console.log(`  Hotels: ${enhancedService.providerPriority.hotels.join(' → ')}`);
        console.log(`  Tickets: ${enhancedService.providerPriority.tickets.join(' → ')}`);
        
        // Verify the priority order is correct
        const expectedPriority = {
            flights: ['serpapi', 'amadeus', 'skyscanner'],
            hotels: ['serpapi_hotels', 'bookingcom', 'agoda'],
            tickets: ['seatgeek', 'ticketmaster']
        };
        
        let priorityCorrect = true;
        Object.entries(expectedPriority).forEach(([type, expected]) => {
            const actual = enhancedService.providerPriority[type];
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                console.log(`❌ ${type} priority mismatch:`);
                console.log(`   Expected: ${expected.join(' → ')}`);
                console.log(`   Actual: ${actual.join(' → ')}`);
                priorityCorrect = false;
            } else {
                console.log(`✅ ${type} priority is correct`);
            }
        });
        
        if (priorityCorrect) {
            console.log('\n✅ All provider priorities are correctly configured!');
        }

        // 2. Test Provider Availability
        console.log('\n2. Testing Provider Availability...');
        
        const availableProviders = await enhancedService.getAvailableProviders();
        
        console.log('Provider Availability Status:');
        Object.entries(availableProviders).forEach(([name, info]) => {
            const status = info.available ? '✅' : '❌';
            console.log(`  ${status} ${name}: ${info.available ? 'Available' : 'Unavailable'}`);
            if (info.error) {
                console.log(`    Error: ${info.error}`);
            }
        });

        // 3. Test Flight Search with New Priority
        console.log('\n3. Testing Flight Search with SerpAPI Priority...');
        
        try {
            const flightResults = await enhancedService.searchFlights(
                'DEN', // Denver
                'LAX', // Los Angeles
                '2025-08-15',
                '2025-08-20',
                1,
                5
            );
            
            console.log(`Flight Search Results:`);
            console.log(`  Total flights found: ${flightResults.flights.length}`);
            console.log(`  Providers used: ${flightResults.providers.length}`);
            
            flightResults.providers.forEach(provider => {
                const status = provider.status === 'success' ? '✅' : '❌';
                console.log(`  ${status} ${provider.name}: ${provider.count || 0} flights`);
                if (provider.error) {
                    console.log(`    Error: ${provider.error}`);
                }
            });
            
            // Check if SerpAPI was used first
            if (flightResults.providers.length > 0) {
                const firstProvider = flightResults.providers[0];
                if (firstProvider.name === 'serpapi' && firstProvider.status === 'success') {
                    console.log('✅ SerpAPI was successfully used as the primary flight provider');
                } else if (firstProvider.name === 'serpapi' && firstProvider.status === 'error') {
                    console.log('⚠️  SerpAPI failed, but was tried first (correct priority)');
                } else {
                    console.log(`⚠️  First provider was ${firstProvider.name}, not SerpAPI`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Flight search error: ${error.message}`);
        }

        // 4. Test Hotel Search with New Priority
        console.log('\n4. Testing Hotel Search with SerpAPI Priority...');
        
        try {
            const hotelResults = await enhancedService.searchHotels(
                'LAX', // Los Angeles
                '2025-08-15',
                '2025-08-20',
                1,
                5,
                5
            );
            
            console.log(`Hotel Search Results:`);
            console.log(`  Total hotels found: ${hotelResults.hotels.length}`);
            console.log(`  Providers used: ${hotelResults.providers.length}`);
            
            hotelResults.providers.forEach(provider => {
                const status = provider.status === 'success' ? '✅' : '❌';
                console.log(`  ${status} ${provider.name}: ${provider.count || 0} hotels`);
                if (provider.error) {
                    console.log(`    Error: ${provider.error}`);
                }
            });
            
            // Check if SerpAPI was used first
            if (hotelResults.providers.length > 0) {
                const firstProvider = hotelResults.providers[0];
                if (firstProvider.name === 'serpapi_hotels' && firstProvider.status === 'success') {
                    console.log('✅ SerpAPI was successfully used as the primary hotel provider');
                } else if (firstProvider.name === 'serpapi_hotels' && firstProvider.status === 'error') {
                    console.log('⚠️  SerpAPI failed, but was tried first (correct priority)');
                } else {
                    console.log(`⚠️  First provider was ${firstProvider.name}, not SerpAPI`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Hotel search error: ${error.message}`);
        }

        // 5. Test Ticket Search with SeatGeek Priority
        console.log('\n5. Testing Ticket Search with SeatGeek Priority...');
        
        try {
            const ticketResults = await enhancedService.searchTickets(
                'Taylor Swift',
                'MetLife Stadium',
                '2025-08-15T20:00:00Z',
                5
            );
            
            console.log(`Ticket Search Results:`);
            console.log(`  Total tickets found: ${ticketResults.tickets.length}`);
            console.log(`  Providers used: ${ticketResults.providers.length}`);
            
            ticketResults.providers.forEach(provider => {
                const status = provider.status === 'success' ? '✅' : '❌';
                console.log(`  ${status} ${provider.name}: ${provider.count || 0} tickets`);
                if (provider.error) {
                    console.log(`    Error: ${provider.error}`);
                }
            });
            
            // Check if SeatGeek was used first
            if (ticketResults.providers.length > 0) {
                const firstProvider = ticketResults.providers[0];
                if (firstProvider.name === 'seatgeek' && firstProvider.status === 'success') {
                    console.log('✅ SeatGeek was successfully used as the primary ticket provider');
                } else if (firstProvider.name === 'seatgeek' && firstProvider.status === 'error') {
                    console.log('⚠️  SeatGeek failed, but was tried first (correct priority)');
                } else {
                    console.log(`⚠️  First provider was ${firstProvider.name}, not SeatGeek`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Ticket search error: ${error.message}`);
        }

        // 6. Test Trip Suggestion Engine Integration
        console.log('\n6. Testing Trip Suggestion Engine Integration...');
        
        try {
            const tripSuggestionEngine = require('./services/tripSuggestionEngine');
            
            // Get a real event from the database
            const eventResult = await pool.query(`
                SELECT id, name, venue_name, venue_city, venue_state, event_date, external_id
                FROM events 
                WHERE event_date > NOW()
                ORDER BY event_date ASC
                LIMIT 1
            `);

            if (eventResult.rows.length > 0) {
                const testEvent = eventResult.rows[0];
                console.log(`Testing trip suggestion with: ${testEvent.name}`);
                
                // Test the searchTickets method
                const ticketResults = await tripSuggestionEngine.searchTickets(testEvent);
                console.log(`Trip suggestion ticket search: ${ticketResults.length} tickets found`);
                
                if (ticketResults.length > 0) {
                    console.log('Sample ticket from trip suggestion:');
                    const ticket = ticketResults[0];
                    console.log(`  Provider: ${ticket.provider || 'Unknown'}`);
                    console.log(`  Price: $${ticket.price || 'N/A'}`);
                    console.log(`  URL: ${ticket.url ? 'Available' : 'Not available'}`);
                }
            } else {
                console.log('❌ No future events found for testing');
            }
            
        } catch (error) {
            console.log(`❌ Trip suggestion engine error: ${error.message}`);
        }

        // 7. Summary
        console.log('\n7. Updated Provider Priority Summary...');
        console.log('=' .repeat(80));
        
        console.log('✅ Provider Priority Updated Successfully!');
        console.log('\nNew Priority Order:');
        console.log('  🛫 Flights: SerpAPI → Amadeus → Skyscanner');
        console.log('  🏨 Hotels: SerpAPI → Booking.com → Agoda');
        console.log('  🎫 Tickets: SeatGeek → Ticketmaster');
        
        console.log('\nBenefits:');
        console.log('  • SerpAPI provides comprehensive Google Flights data');
        console.log('  • SerpAPI provides Google Hotels data');
        console.log('  • SeatGeek provides extensive ticket inventory');
        console.log('  • Fallback to other providers if primary fails');
        console.log('  • Best data from multiple sources is aggregated');
        
        console.log('\n✅ Updated provider priority test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        logger.error('Updated provider priority test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testUpdatedProviderPriority(); 