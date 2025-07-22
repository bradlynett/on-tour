const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');
require('dotenv').config();

async function generateTripsForUser20() {
    console.log('🎵 Generating Trip Suggestions for User 20');
    console.log('=' .repeat(60));

    try {
        // Clear cache first to ensure fresh data
        console.log('\n1. Clearing cache...');
        const keys = await redisClient.keys('*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`   ✅ Cleared ${keys.length} cached entries`);
        }

        // Get user 20 details
        console.log('\n2. Getting user 20 details...');
        const userResult = await pool.query(`
            SELECT id, email, primary_airport, city, state 
            FROM users 
            WHERE id = 20
        `);

        if (userResult.rows.length === 0) {
            console.log('❌ User 20 not found');
            return;
        }

        const user = userResult.rows[0];
        console.log(`   ✅ Found user: ${user.email}`);
        console.log(`   Primary airport: ${user.primary_airport}`);
        console.log(`   Location: ${user.city}, ${user.state}`);

        // Get user's interests
        console.log('\n3. Getting user interests...');
        const interestsResult = await pool.query(`
            SELECT ui.interest_name, ui.priority_score
            FROM user_interests ui
            WHERE ui.user_id = 20
            ORDER BY ui.priority_score DESC
            LIMIT 10
        `);

        console.log(`   ✅ Found ${interestsResult.rows.length} interests`);
        interestsResult.rows.forEach(interest => {
            console.log(`      - ${interest.interest_name} (priority: ${interest.priority_score})`);
        });

        // Get future events for user's interests
        console.log('\n4. Getting future events...');
        const eventsResult = await pool.query(`
            SELECT e.id, e.name, e.artist, e.venue, e.city, e.state, e.event_date, e.ticket_url
            FROM events e
            JOIN event_interests ei ON e.id = ei.event_id
            JOIN user_interests ui ON ei.interest_name = ui.interest_name
            WHERE ui.user_id = 20
            AND e.event_date >= CURRENT_DATE
            ORDER BY e.event_date ASC
            LIMIT 20
        `);

        console.log(`   ✅ Found ${eventsResult.rows.length} future events`);
        eventsResult.rows.slice(0, 5).forEach(event => {
            console.log(`      - ${event.artist} at ${event.venue} on ${event.event_date}`);
        });

        // Generate trip suggestions
        console.log('\n5. Generating trip suggestions...');
        const tripSuggestions = await tripSuggestionEngine.generateTripSuggestionsForUser(20, 10);

        console.log(`   ✅ Generated ${tripSuggestions.length} trip suggestions`);

        // Display trip details
        tripSuggestions.forEach((trip, index) => {
            console.log(`\n   Trip ${index + 1}: ${trip.event_name}`);
            console.log(`      Event: ${trip.event_artist} at ${trip.event_venue}`);
            console.log(`      Date: ${trip.event_date}`);
            console.log(`      Location: ${trip.event_city}, ${trip.event_state}`);
            console.log(`      Total Cost: $${trip.total_cost || 'N/A'}`);
            
            // Count components
            const flightCount = trip.flights ? trip.flights.length : 0;
            const hotelCount = trip.hotels ? trip.hotels.length : 0;
            const ticketCount = trip.tickets ? trip.tickets.length : 0;
            
            console.log(`      Components: ${flightCount} flights, ${hotelCount} hotels, ${ticketCount} tickets`);
        });

        console.log('\n✅ Trip generation complete! You can now test in the UI.');
        console.log('   The trips should now include real hotel data from SerpAPI.');

    } catch (error) {
        console.error('❌ Error generating trips:', error);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the generation
generateTripsForUser20(); 