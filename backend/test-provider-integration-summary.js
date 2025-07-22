const { pool } = require('./config/database');
const { logger } = require('./utils/logger');

async function testProviderIntegrationSummary() {
    console.log('🔍 Multi-Provider Integration Status Summary');
    console.log('=' .repeat(80));

    try {
        // 1. Check Recent Trip Suggestions and Components
        console.log('\n1. Recent Trip Suggestions Analysis...');
        
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
            LIMIT 10
        `);

        if (tripResult.rows.length > 0) {
            console.log(`✅ Found ${tripResult.rows.length} recent trip suggestions`);
            
            // Check trip components for provider data
            const componentResult = await pool.query(`
                SELECT tc.component_type, tc.provider, tc.price, tc.booking_reference,
                       COUNT(*) as count
                FROM trip_components tc
                JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
                WHERE ts.created_at > NOW() - INTERVAL '7 days'
                GROUP BY tc.component_type, tc.provider, tc.price, tc.booking_reference
                ORDER BY tc.component_type, count DESC
            `);

            if (componentResult.rows.length > 0) {
                console.log('\nTrip Components by Provider:');
                const componentsByType = {};
                componentResult.rows.forEach(comp => {
                    if (!componentsByType[comp.component_type]) {
                        componentsByType[comp.component_type] = [];
                    }
                    componentsByType[comp.component_type].push(comp);
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

        // 2. Test Provider Priority Configuration
        console.log('\n2. Provider Priority Configuration...');
        
        try {
            const enhancedService = require('./services/enhancedUnifiedTravelService');
            
            console.log('Provider Priority Order:');
            console.log(`  Tickets: ${enhancedService.providerPriority.tickets.join(' → ')}`);
            console.log(`  Flights: ${enhancedService.providerPriority.flights.join(' → ')}`);
            console.log(`  Hotels: ${enhancedService.providerPriority.hotels.join(' → ')}`);
            
            // Test provider availability
            console.log('\nProvider Availability:');
            const availableProviders = await enhancedService.getAvailableProviders();
            
            Object.entries(availableProviders).forEach(([name, info]) => {
                const status = info.available ? '✅' : '❌';
                console.log(`  ${status} ${name}: ${info.available ? 'Available' : 'Unavailable'}`);
            });
            
        } catch (error) {
            console.log(`❌ Enhanced service error: ${error.message}`);
        }

        // 3. Test Trip Suggestion Engine Integration
        console.log('\n3. Trip Suggestion Engine Integration...');
        
        try {
            const tripSuggestionEngine = require('./services/tripSuggestionEngine');
            
            // Test with a real event from the database
            const eventResult = await pool.query(`
                SELECT id, name, venue_name, venue_city, venue_state, event_date, external_id
                FROM events 
                WHERE event_date > NOW()
                ORDER BY event_date ASC
                LIMIT 1
            `);

            if (eventResult.rows.length > 0) {
                const testEvent = eventResult.rows[0];
                console.log(`Testing with real event: ${testEvent.name}`);
                console.log(`Venue: ${testEvent.venue_name}, ${testEvent.venue_city}, ${testEvent.venue_state}`);
                
                // Test the searchTickets method
                const ticketResults = await tripSuggestionEngine.searchTickets(testEvent);
                console.log(`Ticket search results: ${ticketResults.length} tickets found`);
                
                if (ticketResults.length > 0) {
                    console.log('Sample ticket details:');
                    ticketResults.slice(0, 3).forEach((ticket, index) => {
                        console.log(`  ${index + 1}. Provider: ${ticket.provider || 'Unknown'}`);
                        console.log(`     Price: $${ticket.price || 'N/A'}`);
                        console.log(`     URL: ${ticket.url ? 'Available' : 'Not available'}`);
                    });
                }
            } else {
                console.log('❌ No future events found for testing');
            }
            
        } catch (error) {
            console.log(`❌ Trip suggestion engine error: ${error.message}`);
        }

        // 4. Check Booking URL Availability
        console.log('\n4. Booking URL Availability Analysis...');
        
        const urlResult = await pool.query(`
            SELECT 
                tc.component_type,
                COUNT(*) as total,
                COUNT(CASE WHEN tc.booking_reference IS NOT NULL AND tc.booking_reference != '' THEN 1 END) as with_url,
                COUNT(CASE WHEN tc.booking_reference IS NULL OR tc.booking_reference = '' THEN 1 END) as without_url
            FROM trip_components tc
            WHERE tc.created_at > NOW() - INTERVAL '7 days'
            GROUP BY tc.component_type
            ORDER BY tc.component_type
        `);

        if (urlResult.rows.length > 0) {
            console.log('Booking URL Availability:');
            urlResult.rows.forEach(row => {
                const percentage = row.total > 0 ? Math.round((row.with_url / row.total) * 100) : 0;
                console.log(`  ${row.component_type.toUpperCase()}: ${row.with_url}/${row.total} (${percentage}%) have booking URLs`);
            });
        }

        // 5. Check Provider Diversity
        console.log('\n5. Provider Diversity Analysis...');
        
        const providerResult = await pool.query(`
            SELECT 
                tc.component_type,
                tc.provider,
                COUNT(*) as count
            FROM trip_components tc
            WHERE tc.created_at > NOW() - INTERVAL '7 days'
            GROUP BY tc.component_type, tc.provider
            ORDER BY tc.component_type, count DESC
        `);

        if (providerResult.rows.length > 0) {
            console.log('Providers Used by Component Type:');
            const providersByType = {};
            providerResult.rows.forEach(row => {
                if (!providersByType[row.component_type]) {
                    providersByType[row.component_type] = [];
                }
                providersByType[row.component_type].push(row);
            });

            Object.entries(providersByType).forEach(([type, providers]) => {
                console.log(`  ${type.toUpperCase()}:`);
                providers.forEach(prov => {
                    console.log(`    ${prov.provider || 'Unknown'}: ${prov.count} components`);
                });
            });
        }

        // 6. Summary and Recommendations
        console.log('\n6. Integration Summary and Recommendations...');
        console.log('=' .repeat(80));
        
        const summary = {
            hasRecentTrips: tripResult.rows.length > 0,
            hasComponents: componentResult && componentResult.rows.length > 0,
            hasBookingUrls: urlResult.rows.some(r => r.with_url > 0),
            multipleProviders: providerResult.rows.length > 0 ? 
                new Set(providerResult.rows.map(r => r.provider)).size > 1 : false,
            providerCount: providerResult.rows.length > 0 ? 
                new Set(providerResult.rows.map(r => r.provider)).size : 0
        };
        
        console.log('Current Integration Status:');
        console.log(`  Recent trips in database: ${summary.hasRecentTrips ? '✅ Yes' : '❌ No'}`);
        console.log(`  Trip components available: ${summary.hasComponents ? '✅ Yes' : '❌ No'}`);
        console.log(`  Booking URLs available: ${summary.hasBookingUrls ? '✅ Yes' : '❌ No'}`);
        console.log(`  Multiple providers used: ${summary.multipleProviders ? '✅ Yes' : '❌ No'}`);
        console.log(`  Total unique providers: ${summary.providerCount}`);
        
        // Key Findings
        console.log('\nKey Findings:');
        
        if (summary.hasRecentTrips) {
            console.log('✅ Trip suggestions are being generated successfully');
        } else {
            console.log('❌ No recent trip suggestions found - may need to generate some');
        }
        
        if (summary.hasComponents) {
            console.log('✅ Trip components (flights, hotels, tickets) are being saved');
        } else {
            console.log('❌ No trip components found - check component generation');
        }
        
        if (summary.hasBookingUrls) {
            console.log('✅ Booking URLs are being saved to the database');
        } else {
            console.log('❌ No booking URLs found - this affects user experience');
        }
        
        if (summary.multipleProviders) {
            console.log('✅ Multiple providers are being used for data aggregation');
        } else {
            console.log('⚠️  Only single provider being used - may need more provider integration');
        }
        
        // Recommendations
        console.log('\nRecommendations:');
        
        if (!summary.hasRecentTrips) {
            console.log('1. Generate new trip suggestions to test provider integration');
        }
        
        if (!summary.hasBookingUrls) {
            console.log('2. Verify that booking URLs are being saved in the booking_reference field');
        }
        
        if (!summary.multipleProviders) {
            console.log('3. Check provider API credentials and availability');
            console.log('4. Verify that provider priority logic is working correctly');
        }
        
        if (summary.providerCount < 2) {
            console.log('5. Consider adding more providers for better data coverage');
        }
        
        console.log('\n✅ Multi-provider integration analysis completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        logger.error('Provider integration summary test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testProviderIntegrationSummary(); 