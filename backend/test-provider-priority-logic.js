const { pool } = require('./config/database');
const { logger } = require('./utils/logger');

async function testProviderPriorityLogic() {
    console.log('🔍 Testing Provider Priority Logic and Data Flow');
    console.log('=' .repeat(80));

    try {
        // 1. Test Trip Suggestion Engine's searchTickets method
        console.log('\n1. Testing Trip Suggestion Engine Ticket Search Logic...');
        
        // Import the trip suggestion engine
        const tripSuggestionEngine = require('./services/tripSuggestionEngine');
        
        // Create a mock event for testing
        const mockEvent = {
            id: 'test-event-1',
            name: 'Taylor Swift - The Eras Tour',
            venue_name: 'MetLife Stadium',
            venue_city: 'East Rutherford',
            venue_state: 'NJ',
            event_date: '2025-08-15T20:00:00Z',
            external_id: 'test-ticketmaster-id'
        };

        console.log(`Testing with event: ${mockEvent.name}`);
        console.log(`Venue: ${mockEvent.venue_name}, ${mockEvent.venue_city}, ${mockEvent.venue_state}`);
        console.log(`Date: ${mockEvent.event_date}`);

        // Test the searchTickets method
        const ticketResults = await tripSuggestionEngine.searchTickets(mockEvent);
        
        console.log(`\nTicket Search Results:`);
        console.log(`  Tickets found: ${ticketResults.length}`);
        
        if (ticketResults.length > 0) {
            console.log('\nTicket Details:');
            ticketResults.forEach((ticket, index) => {
                console.log(`  ${index + 1}. Provider: ${ticket.provider || 'Unknown'}`);
                console.log(`     Price: $${ticket.price || 'N/A'}`);
                console.log(`     Max Price: $${ticket.maxPrice || 'N/A'}`);
                console.log(`     URL: ${ticket.url ? 'Available' : 'Not available'}`);
                console.log(`     Details: ${ticket.details ? 'Available' : 'Not available'}`);
                console.log(`     Delivery: ${ticket.delivery || 'N/A'}`);
            });
        }

        // 2. Test Enhanced Unified Travel Service Provider Priority
        console.log('\n2. Testing Enhanced Unified Travel Service Provider Priority...');
        
        // Check if the enhanced service is properly configured
        try {
            const enhancedService = require('./services/enhancedUnifiedTravelService');
            
            console.log('Provider Priority Configuration:');
            console.log(`  Flights: ${enhancedService.providerPriority.flights.join(' → ')}`);
            console.log(`  Hotels: ${enhancedService.providerPriority.hotels.join(' → ')}`);
            console.log(`  Tickets: ${enhancedService.providerPriority.tickets.join(' → ')}`);
            
            // Test provider availability check
            console.log('\nProvider Availability Check:');
            const availableProviders = await enhancedService.getAvailableProviders();
            
            Object.entries(availableProviders).forEach(([name, info]) => {
                const status = info.available ? '✅' : '❌';
                console.log(`  ${status} ${name}: ${info.available ? 'Available' : 'Unavailable'}`);
                if (info.error) {
                    console.log(`    Error: ${info.error}`);
                }
            });
            
        } catch (error) {
            console.log(`❌ Enhanced service error: ${error.message}`);
        }

        // 3. Test Database Trip Components for Provider Data
        console.log('\n3. Testing Database Trip Components for Provider Data...');
        
        // Check recent trip suggestions in the database
        const tripResult = await pool.query(`
            SELECT ts.id, ts.event_id, ts.total_cost, ts.status,
                   e.name as event_name, e.venue_name, e.event_date,
                   COUNT(tc.id) as component_count
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
            WHERE ts.created_at > NOW() - INTERVAL '7 days'
            GROUP BY ts.id, ts.event_id, ts.total_cost, ts.status, e.name, e.venue_name, e.event_date
            ORDER BY ts.created_at DESC
            LIMIT 5
        `);

        if (tripResult.rows.length > 0) {
            console.log(`\nRecent Trip Suggestions (last 7 days):`);
            tripResult.rows.forEach((trip, index) => {
                console.log(`  ${index + 1}. ${trip.event_name}`);
                console.log(`     Venue: ${trip.venue_name}`);
                console.log(`     Date: ${trip.event_date}`);
                console.log(`     Components: ${trip.component_count}`);
                console.log(`     Status: ${trip.status}`);
                console.log(`     Total Cost: $${trip.total_cost || 'N/A'}`);
            });

            // Check trip components for provider data
            const componentResult = await pool.query(`
                SELECT tc.type, tc.provider, tc.price, tc.booking_reference,
                       COUNT(*) as count
                FROM trip_components tc
                JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
                WHERE ts.created_at > NOW() - INTERVAL '7 days'
                GROUP BY tc.type, tc.provider, tc.price, tc.booking_reference
                ORDER BY tc.type, count DESC
            `);

            if (componentResult.rows.length > 0) {
                console.log('\nTrip Components by Provider:');
                const componentsByType = {};
                componentResult.rows.forEach(comp => {
                    if (!componentsByType[comp.type]) {
                        componentsByType[comp.type] = [];
                    }
                    componentsByType[comp.type].push(comp);
                });

                Object.entries(componentsByType).forEach(([type, components]) => {
                    console.log(`  ${type.toUpperCase()}:`);
                    components.forEach(comp => {
                        const hasUrl = comp.booking_reference ? 'Yes' : 'No';
                        console.log(`    ${comp.provider || 'Unknown'}: ${comp.count} options, $${comp.price || 'N/A'}, URL: ${hasUrl}`);
                    });
                });
            }
        } else {
            console.log('❌ No recent trip suggestions found in database');
        }

        // 4. Test Provider Priority Logic
        console.log('\n4. Testing Provider Priority Logic...');
        
        // Simulate the provider priority logic
        const providerPriority = {
            tickets: ['seatgeek', 'ticketmaster'],
            flights: ['serpapi', 'amadeus', 'skyscanner'],
            hotels: ['serpapi_hotels', 'bookingcom', 'agoda']
        };

        console.log('Provider Priority Order:');
        Object.entries(providerPriority).forEach(([type, providers]) => {
            console.log(`  ${type}: ${providers.join(' → ')}`);
        });

        // 5. Test Data Quality Assessment
        console.log('\n5. Testing Data Quality Assessment...');
        
        // Check if we have real vs estimated pricing
        const pricingResult = await pool.query(`
            SELECT 
                tc.type,
                tc.price_type,
                COUNT(*) as count,
                AVG(tc.price) as avg_price
            FROM trip_components tc
            WHERE tc.created_at > NOW() - INTERVAL '7 days'
            GROUP BY tc.type, tc.price_type
            ORDER BY tc.type, count DESC
        `);

        if (pricingResult.rows.length > 0) {
            console.log('\nPricing Data Quality:');
            pricingResult.rows.forEach(row => {
                console.log(`  ${row.type.toUpperCase()} - ${row.price_type || 'Unknown'}: ${row.count} options, avg $${Math.round(row.avg_price || 0)}`);
            });
        }

        // 6. Test Booking URL Availability
        console.log('\n6. Testing Booking URL Availability...');
        
        const urlResult = await pool.query(`
            SELECT 
                tc.type,
                COUNT(*) as total,
                COUNT(CASE WHEN tc.booking_reference IS NOT NULL AND tc.booking_reference != '' THEN 1 END) as with_url,
                COUNT(CASE WHEN tc.booking_reference IS NULL OR tc.booking_reference = '' THEN 1 END) as without_url
            FROM trip_components tc
            WHERE tc.created_at > NOW() - INTERVAL '7 days'
            GROUP BY tc.type
            ORDER BY tc.type
        `);

        if (urlResult.rows.length > 0) {
            console.log('\nBooking URL Availability:');
            urlResult.rows.forEach(row => {
                const percentage = row.total > 0 ? Math.round((row.with_url / row.total) * 100) : 0;
                console.log(`  ${row.type.toUpperCase()}: ${row.with_url}/${row.total} (${percentage}%) have booking URLs`);
            });
        }

        // 7. Summary and Recommendations
        console.log('\n7. Integration Summary and Recommendations...');
        console.log('=' .repeat(80));
        
        const summary = {
            hasRecentTrips: tripResult.rows.length > 0,
            hasComponents: componentResult.rows.length > 0,
            hasRealPricing: pricingResult.rows.some(r => r.price_type === 'real'),
            hasBookingUrls: urlResult.rows.some(r => r.with_url > 0),
            multipleProviders: componentResult.rows.length > 0 ? 
                new Set(componentResult.rows.map(r => r.provider)).size > 1 : false
        };
        
        console.log('Current Integration Status:');
        console.log(`  Recent trips in database: ${summary.hasRecentTrips ? '✅ Yes' : '❌ No'}`);
        console.log(`  Trip components available: ${summary.hasComponents ? '✅ Yes' : '❌ No'}`);
        console.log(`  Real pricing data: ${summary.hasRealPricing ? '✅ Yes' : '❌ No'}`);
        console.log(`  Booking URLs available: ${summary.hasBookingUrls ? '✅ Yes' : '❌ No'}`);
        console.log(`  Multiple providers used: ${summary.multipleProviders ? '✅ Yes' : '❌ No'}`);
        
        // Recommendations
        console.log('\nRecommendations:');
        if (!summary.hasRecentTrips) {
            console.log('⚠️  No recent trips found. Generate some trip suggestions to test provider integration.');
        }
        
        if (!summary.hasRealPricing) {
            console.log('⚠️  Only estimated pricing found. Check API integrations for real pricing data.');
        }
        
        if (!summary.hasBookingUrls) {
            console.log('⚠️  No booking URLs found. This affects user experience.');
        }
        
        if (!summary.multipleProviders) {
            console.log('⚠️  Only single provider being used. Check provider availability and priority logic.');
        }
        
        console.log('\n✅ Provider priority logic test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        logger.error('Provider priority logic test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testProviderPriorityLogic(); 