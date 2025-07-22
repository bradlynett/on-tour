// Test script for fuzzy artist name matching and smart prioritization
const { pool } = require('../config/database');
const tripEngine = require('../services/tripSuggestionEngine');

async function testFuzzyMatching() {
    try {
        console.log('🧪 Testing fuzzy artist name matching...\n');

        // Test 1: Check if "Weird Al" Yankovic matches "Weird Al Yankovic"
        console.log('Test 1: "Weird Al" Yankovic matching');
        const testInterest1 = { interest_type: 'artist', interest_value: '"Weird Al" Yankovic' };
        const events1 = await tripEngine.findEventsByInterests([testInterest1]);
        console.log(`Found ${events1.length} events for "Weird Al" Yankovic`);
        events1.forEach(event => {
            console.log(`  - ${event.artist} at ${event.venue_name}, ${event.venue_city} on ${event.event_date}`);
        });

        // Test 2: Check if "Weird Al Yankovic" (no quotes) matches events
        console.log('\nTest 2: Weird Al Yankovic (no quotes) matching');
        const testInterest2 = { interest_type: 'artist', interest_value: 'Weird Al Yankovic' };
        const events2 = await tripEngine.findEventsByInterests([testInterest2]);
        console.log(`Found ${events2.length} events for Weird Al Yankovic`);
        events2.forEach(event => {
            console.log(`  - ${event.artist} at ${event.venue_name}, ${event.venue_city} on ${event.event_date}`);
        });

        // Test 3: Test prioritization with a real user
        console.log('\nTest 3: Smart prioritization for user');
        const usersResult = await pool.query('SELECT id, email, city, state FROM users LIMIT 1');
        if (usersResult.rows.length > 0) {
            const user = usersResult.rows[0];
            console.log(`Testing prioritization for user: ${user.email} (${user.city}, ${user.state})`);
            
            const { events, interests, preferences } = await tripEngine.findMatchingEvents(user.id);
            console.log(`Found ${events.length} prioritized events`);
            
            events.slice(0, 5).forEach((event, index) => {
                console.log(`  ${index + 1}. ${event.artist} at ${event.venue_name}, ${event.venue_city} on ${event.event_date}`);
            });
        }

        // Test 4: Check all events in database for artist names
        console.log('\nTest 4: All artist names in database');
        const allEventsResult = await pool.query(`
            SELECT DISTINCT artist, COUNT(*) as event_count 
            FROM events 
            WHERE artist IS NOT NULL AND artist != ''
            GROUP BY artist 
            ORDER BY event_count DESC 
            LIMIT 10
        `);
        
        console.log('Top 10 artists by event count:');
        allEventsResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. "${row.artist}" (${row.event_count} events)`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testFuzzyMatching(); 