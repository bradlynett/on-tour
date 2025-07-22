const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function generateTestTrips() {
    console.log('🎯 Generating Test Trips with Current Provider Setup');
    console.log('=' .repeat(80));

    try {
        // 1. Get a test user
        console.log('\n1. Getting test user...');
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        
        if (userResult.rows.length === 0) {
            console.log('❌ No users found. Creating a test user...');
            const createUserResult = await pool.query(`
                INSERT INTO users (email, password_hash, first_name, last_name)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, ['test@example.com', 'test_hash', 'Test', 'User']);
            
            const userId = createUserResult.rows[0].id;
            console.log(`✅ Created test user with ID: ${userId}`);
        } else {
            const userId = userResult.rows[0].id;
            console.log(`✅ Using existing user with ID: ${userId}`);
        }

        // 2. Get future events
        console.log('\n2. Getting future events...');
        const eventsResult = await pool.query(`
            SELECT id, name, venue_name, venue_city, venue_state, event_date, external_id
            FROM events 
            WHERE event_date > NOW()
            ORDER BY event_date ASC
            LIMIT 3
        `);

        if (eventsResult.rows.length === 0) {
            console.log('❌ No future events found. Creating test events...');
            
            // Create some test events
            const testEvents = [
                {
                    name: 'Taylor Swift - The Eras Tour',
                    venue_name: 'MetLife Stadium',
                    venue_city: 'East Rutherford',
                    venue_state: 'NJ',
                    event_date: '2025-08-15T20:00:00Z'
                },
                {
                    name: 'Ed Sheeran - Mathematics Tour',
                    venue_name: 'Madison Square Garden',
                    venue_city: 'New York',
                    venue_state: 'NY',
                    event_date: '2025-09-20T19:30:00Z'
                },
                {
                    name: 'Beyoncé - Renaissance World Tour',
                    venue_name: 'SoFi Stadium',
                    venue_city: 'Inglewood',
                    venue_state: 'CA',
                    event_date: '2025-10-10T20:00:00Z'
                }
            ];

            for (const event of testEvents) {
                await pool.query(`
                    INSERT INTO events (name, venue_name, venue_city, venue_state, event_date)
                    VALUES ($1, $2, $3, $4, $5)
                `, [event.name, event.venue_name, event.venue_city, event.venue_state, event.event_date]);
            }
            
            console.log('✅ Created test events');
            
            // Get the events again
            const newEventsResult = await pool.query(`
                SELECT id, name, venue_name, venue_city, venue_state, event_date, external_id
                FROM events 
                WHERE event_date > NOW()
                ORDER BY event_date ASC
                LIMIT 3
            `);
            
            eventsResult.rows = newEventsResult.rows;
        }

        console.log(`✅ Found ${eventsResult.rows.length} future events:`);
        eventsResult.rows.forEach((event, index) => {
            console.log(`  ${index + 1}. ${event.name} at ${event.venue_name}`);
        });

        // 3. Generate trip suggestions for each event
        console.log('\n3. Generating trip suggestions...');
        
        for (const event of eventsResult.rows) {
            console.log(`\n🎫 Generating trip for: ${event.name}`);
            console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
            console.log(`   Date: ${event.event_date}`);
            
            try {
                // Test ticket search first
                console.log('   🔍 Testing ticket search...');
                const ticketResults = await tripSuggestionEngine.searchTickets(event);
                console.log(`   ✅ Found ${ticketResults.length} ticket options`);
                
                if (ticketResults.length > 0) {
                    console.log('   Sample ticket:');
                    const ticket = ticketResults[0];
                    console.log(`     Provider: ${ticket.provider || 'Unknown'}`);
                    console.log(`     Price: $${ticket.price || 'N/A'}`);
                    console.log(`     URL: ${ticket.url ? 'Available' : 'Not available'}`);
                }
                
                // Create trip suggestion
                console.log('   🛫 Creating trip suggestion...');
                const tripSuggestion = await tripSuggestionEngine.createTripSuggestion(
                    userResult.rows[0].id,
                    event.id,
                    {
                        primary_airport: 'DEN', // Denver as example
                        flight_class: 'economy',
                        preferred_hotel_brands: ['Marriott', 'Hilton']
                    }
                );
                
                console.log(`   ✅ Trip suggestion created with ID: ${tripSuggestion.id}`);
                console.log(`   Total cost: $${tripSuggestion.total_cost || 'N/A'}`);
                
                // Get trip components
                const completeTrip = await tripSuggestionEngine.getTripSuggestionWithDetails(tripSuggestion.id);
                
                if (completeTrip.components) {
                    console.log('   Trip components:');
                    Object.entries(completeTrip.components).forEach(([type, components]) => {
                        if (components && components.length > 0) {
                            console.log(`     ${type.toUpperCase()}: ${components.length} options`);
                            components.slice(0, 2).forEach((comp, index) => {
                                const provider = comp.provider || comp.searchProvider || 'Unknown';
                                const price = comp.price || comp.price?.total || 'N/A';
                                const hasUrl = comp.url || comp.bookingUrl ? 'Yes' : 'No';
                                console.log(`       ${index + 1}. ${provider} - $${price} (URL: ${hasUrl})`);
                            });
                        } else {
                            console.log(`     ${type.toUpperCase()}: No options available`);
                        }
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Error creating trip: ${error.message}`);
            }
        }

        // 4. Summary
        console.log('\n4. Trip Generation Summary...');
        console.log('=' .repeat(80));
        
        const tripCountResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM trip_suggestions
            WHERE created_at > NOW() - INTERVAL '1 hour'
        `);
        
        const componentCountResult = await pool.query(`
            SELECT tc.component_type, COUNT(*) as count
            FROM trip_components tc
            JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
            WHERE ts.created_at > NOW() - INTERVAL '1 hour'
            GROUP BY tc.component_type
        `);
        
        console.log(`✅ Generated ${tripCountResult.rows[0].count} trip suggestions in the last hour`);
        
        if (componentCountResult.rows.length > 0) {
            console.log('Trip components by type:');
            componentCountResult.rows.forEach(row => {
                console.log(`  ${row.component_type.toUpperCase()}: ${row.count} components`);
            });
        }
        
        console.log('\n🎉 Trip generation test completed!');
        console.log('\nNext steps:');
        console.log('1. Check the frontend to see the new trip suggestions');
        console.log('2. Verify that booking buttons are showing');
        console.log('3. Test the user feedback functionality');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
generateTestTrips(); 