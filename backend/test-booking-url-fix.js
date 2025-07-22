const tripEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');

async function testBookingUrlFix() {
    console.log('🔗 Testing Booking URL Fix...\n');

    try {
        // Test 1: Check recent trip components for booking URLs
        console.log('🔍 Test 1: Checking recent trip components for booking URLs...');
        const componentsResult = await pool.query(`
            SELECT tc.component_type, tc.provider, tc.price, tc.booking_reference, tc.details
            FROM trip_components tc
            JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
            WHERE ts.created_at >= NOW() - INTERVAL '1 day'
            ORDER BY tc.created_at DESC
            LIMIT 10
        `);

        console.log(`✅ Found ${componentsResult.rows.length} recent trip components`);
        
        let hasBookingUrls = 0;
        for (const comp of componentsResult.rows) {
            const hasBooking = comp.booking_reference || 
                              (comp.details && (comp.details.bookingUrl || comp.details.booking_url || comp.details.url));
            
            if (hasBooking) hasBookingUrls++;
            
            console.log(`  🧩 ${comp.component_type} from ${comp.provider}: $${comp.price} ${hasBooking ? '🔗' : '❌'}`);
            
            if (comp.booking_reference) {
                console.log(`     📎 Booking Reference: ${comp.booking_reference}`);
            }
            
            if (comp.details) {
                try {
                    const details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                    if (details.bookingUrl || details.booking_url || details.url) {
                        console.log(`     🔗 Details URL: ${details.bookingUrl || details.booking_url || details.url}`);
                    }
                } catch (e) {
                    // Details might not be JSON
                }
            }
        }

        console.log(`\n📊 Booking URL Analysis:`);
        console.log(`   Components with booking URLs: ${hasBookingUrls}/${componentsResult.rows.length}`);

        // Test 2: Test enhanced trip suggestions API
        console.log('\n🔍 Test 2: Testing enhanced trip suggestions API...');
        
        // Get a user with recent trips
        const userResult = await pool.query(`
            SELECT DISTINCT ts.user_id
            FROM trip_suggestions ts
            WHERE ts.created_at >= NOW() - INTERVAL '1 day'
            LIMIT 1
        `);

        if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].user_id;
            console.log(`   Testing with user ${userId}`);
            
            const enhancedTrips = await tripEngine.getEnhancedTripSuggestions(userId, 2);
            console.log(`   ✅ Retrieved ${enhancedTrips.length} enhanced trip suggestions`);
            
            for (const trip of enhancedTrips) {
                console.log(`     📍 ${trip.eventName} by ${trip.artist}`);
                
                if (trip.components) {
                    for (const comp of trip.components) {
                        const hasBooking = comp.bookingUrl || 
                                          (comp.enrichedDetails && (comp.enrichedDetails.bookingUrl || comp.enrichedDetails.booking_url || comp.enrichedDetails.url));
                        console.log(`        ${comp.componentType}: $${comp.price} from ${comp.provider} ${hasBooking ? '🔗' : '❌'}`);
                        
                        if (comp.bookingUrl) {
                            console.log(`           📎 Booking URL: ${comp.bookingUrl}`);
                        }
                    }
                }
            }
        }

        // Test 3: Generate a new trip suggestion to test the fix
        console.log('\n🔍 Test 3: Generating new trip suggestion to test booking URL fix...');
        
        // Get a recent event
        const eventResult = await pool.query(`
            SELECT id, name, artist, venue_city, venue_state, event_date
            FROM events
            WHERE event_date >= CURRENT_DATE + INTERVAL '1 month'
            LIMIT 1
        `);

        if (eventResult.rows.length > 0) {
            const event = eventResult.rows[0];
            console.log(`   Testing with event: ${event.name} by ${event.artist}`);
            
            // Get a user
            const testUserResult = await pool.query(`
                SELECT id FROM users LIMIT 1
            `);
            
            if (testUserResult.rows.length > 0) {
                const userId = testUserResult.rows[0].id;
                
                // Create a new trip suggestion
                const newTrip = await tripEngine.createTripSuggestion(userId, event.id);
                
                if (newTrip) {
                    console.log(`   ✅ Created new trip suggestion ${newTrip.id}`);
                    
                    // Check if components have booking URLs
                    if (newTrip.components) {
                        for (const comp of newTrip.components) {
                            const hasBooking = comp.bookingUrl || 
                                              (comp.enrichedDetails && (comp.enrichedDetails.bookingUrl || comp.enrichedDetails.booking_url || comp.enrichedDetails.url));
                            console.log(`      ${comp.componentType}: $${comp.price} from ${comp.provider} ${hasBooking ? '🔗' : '❌'}`);
                            
                            if (comp.bookingUrl) {
                                console.log(`         📎 Booking URL: ${comp.bookingUrl}`);
                            }
                        }
                    }
                }
            }
        }

        console.log('\n🎯 BOOKING URL FIX TEST SUMMARY:');
        if (hasBookingUrls > 0) {
            console.log('✅ Booking URLs are being saved to database');
            console.log('✅ Booking buttons should now be visible on trip cards');
        } else {
            console.log('⚠️  No booking URLs found - may need to regenerate trip suggestions');
        }

        console.log('\n🔗 Booking URL fix test complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testBookingUrlFix().catch(console.error); 