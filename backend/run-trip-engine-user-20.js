const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');
require('dotenv').config();

// Import only the core trip suggestion engine without loading all services
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function runTripEngineForUser20() {
    console.log('🎵 Running Trip Suggestion Engine for User 20');
    console.log('=' .repeat(60));

    try {
        // Clear cache first
        console.log('\n1. Clearing cache...');
        const keys = await redisClient.keys('*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`   ✅ Cleared ${keys.length} cached entries`);
        }

        // Check if user 20 exists
        console.log('\n2. Checking user 20...');
        const userResult = await pool.query('SELECT id, email FROM users WHERE id = 20');
        
        if (userResult.rows.length === 0) {
            console.log('❌ User 20 not found');
            return;
        }

        console.log(`   ✅ Found user: ${userResult.rows[0].email}`);

        // Generate trip suggestions
        console.log('\n3. Generating trip suggestions...');
        console.log('   This may take a few minutes as it searches for real flights and hotels...');
        
        const tripSuggestions = await tripSuggestionEngine.generateTripSuggestions(20, 5);

        console.log(`\n✅ Generated ${tripSuggestions.length} trip suggestions`);

        // Display results
        tripSuggestions.forEach((trip, index) => {
            console.log(`\n🎵 Trip ${index + 1}:`);
            console.log(`   Event: ${trip.event_artist} - ${trip.event_name}`);
            console.log(`   Venue: ${trip.event_venue}`);
            console.log(`   Date: ${trip.event_date}`);
            console.log(`   Location: ${trip.event_city}, ${trip.event_state}`);
            console.log(`   Total Cost: $${trip.total_cost || 'N/A'}`);
            
            if (trip.flights && trip.flights.length > 0) {
                console.log(`   ✈️ Flights: ${trip.flights.length} options`);
                trip.flights.slice(0, 2).forEach((flight, fIdx) => {
                    console.log(`      ${fIdx + 1}. ${flight.airline} - $${flight.price?.total || 'N/A'}`);
                });
            }
            
            if (trip.hotels && trip.hotels.length > 0) {
                console.log(`   🏨 Hotels: ${trip.hotels.length} options`);
                trip.hotels.slice(0, 2).forEach((hotel, hIdx) => {
                    console.log(`      ${hIdx + 1}. ${hotel.name} - $${hotel.offers?.[0]?.price?.total || 'N/A'}`);
                });
            }
            
            if (trip.tickets && trip.tickets.length > 0) {
                console.log(`   🎫 Tickets: ${trip.tickets.length} options`);
                trip.tickets.slice(0, 2).forEach((ticket, tIdx) => {
                    console.log(`      ${tIdx + 1}. ${ticket.section || 'General'} - $${ticket.price?.total || 'N/A'}`);
                });
            }
        });

        console.log('\n🎉 Trip generation complete! You can now test in the UI.');
        console.log('   The trips should include real data from SerpAPI for hotels and flights.');

    } catch (error) {
        console.error('❌ Error running trip engine:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the trip engine
runTripEngineForUser20(); 