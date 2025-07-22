const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');
const serpapiProvider = require('./services/providers/serpapiProvider');
require('dotenv').config();

async function runSimpleTripEngine() {
    console.log('🎵 Running Simple Trip Engine for User 20');
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
        const userResult = await pool.query(`
            SELECT id, email, city, state 
            FROM users 
            WHERE id = 20
        `);
        
        if (userResult.rows.length === 0) {
            console.log('❌ User 20 not found');
            return;
        }

        const user = userResult.rows[0];
        console.log(`   ✅ Found user: ${user.email}`);
        console.log(`   Location: ${user.city}, ${user.state}`);

        // Get user's primary airport from metro_areas table
        let primaryAirport = null;
        if (user.city && user.state) {
            const airportResult = await pool.query(`
                SELECT primary_airport 
                FROM metro_areas 
                WHERE LOWER(city) = LOWER($1) AND LOWER(state) = LOWER($2)
            `, [user.city, user.state]);
            
            if (airportResult.rows.length > 0) {
                primaryAirport = airportResult.rows[0].primary_airport;
                console.log(`   Primary airport: ${primaryAirport}`);
            }
        }

        // Get user's interests
        console.log('\n3. Getting user interests...');
        const interestsResult = await pool.query(`
            SELECT ui.interest_type, ui.interest_value, ui.priority
            FROM user_interests ui
            WHERE ui.user_id = 20
            ORDER BY ui.priority ASC
            LIMIT 10
        `);

        console.log(`   ✅ Found ${interestsResult.rows.length} interests`);
        interestsResult.rows.forEach(interest => {
            console.log(`      - ${interest.interest_type}: ${interest.interest_value} (priority: ${interest.priority})`);
        });

        // Get future events for user's interests
        console.log('\n4. Getting future events...');
        const eventsResult = await pool.query(`
            SELECT e.id, e.name, e.artist, e.venue, e.city, e.state, e.event_date, e.ticket_url
            FROM events e
            JOIN event_interests ei ON e.id = ei.event_id
            JOIN user_interests ui ON ei.interest_name = ui.interest_value
            WHERE ui.user_id = 20
            AND e.event_date >= CURRENT_DATE
            ORDER BY e.event_date ASC
            LIMIT 10
        `);

        console.log(`   ✅ Found ${eventsResult.rows.length} future events`);
        eventsResult.rows.slice(0, 3).forEach(event => {
            console.log(`      - ${event.artist} at ${event.venue} on ${event.event_date}`);
        });

        // Initialize SerpAPI provider
        console.log('\n5. Initializing SerpAPI provider...');
        const serpapi = new serpapiProvider();
        const isAvailable = await serpapi.isAvailable();
        console.log(`   SerpAPI available: ${isAvailable}`);

        if (!isAvailable) {
            console.log('❌ SerpAPI not available - cannot generate trips with real data');
            return;
        }

        // Generate trip suggestions for first 3 events
        console.log('\n6. Generating trip suggestions...');
        const tripSuggestions = [];

        for (let i = 0; i < Math.min(3, eventsResult.rows.length); i++) {
            const event = eventsResult.rows[i];
            console.log(`\n   Processing event ${i + 1}: ${event.artist} at ${event.venue}`);
            
            try {
                // Search for hotels
                console.log(`      🔍 Searching hotels in ${event.city}, ${event.state}...`);
                const hotels = await serpapi.searchHotels(
                    `${event.city}, ${event.state}`, 
                    event.event_date, 
                    new Date(new Date(event.event_date).getTime() + 24*60*60*1000).toISOString().split('T')[0], // next day
                    1, // adults
                    5, // radius
                    5  // max results
                );
                console.log(`      ✅ Found ${hotels.length} hotels`);

                // Search for flights (if user has primary airport)
                let flights = [];
                if (primaryAirport) {
                    console.log(`      ✈️ Searching flights from ${primaryAirport} to ${event.city}...`);
                    try {
                        flights = await serpapi.searchFlights(
                            primaryAirport,
                            event.city,
                            event.event_date,
                            null, // no return date
                            1, // passengers
                            5  // max results
                        );
                        console.log(`      ✅ Found ${flights.length} flights`);
                    } catch (flightError) {
                        console.log(`      ⚠️ Flight search error: ${flightError.message}`);
                    }
                }

                // Calculate total cost
                const hotelCost = hotels.length > 0 ? hotels[0].offers?.[0]?.price?.total || 0 : 0;
                const flightCost = flights.length > 0 ? flights[0].price?.total || 0 : 0;
                const totalCost = hotelCost + flightCost;

                // Create trip suggestion
                const tripSuggestion = {
                    event_id: event.id,
                    event_name: event.name,
                    event_artist: event.artist,
                    event_venue: event.venue,
                    event_city: event.city,
                    event_state: event.state,
                    event_date: event.event_date,
                    total_cost: totalCost,
                    hotels: hotels,
                    flights: flights,
                    tickets: [{ price: { total: 50 }, section: 'General Admission' }] // placeholder
                };

                tripSuggestions.push(tripSuggestion);
                console.log(`      💰 Total estimated cost: $${totalCost}`);

            } catch (error) {
                console.log(`      ❌ Error processing event: ${error.message}`);
            }
        }

        console.log(`\n✅ Generated ${tripSuggestions.length} trip suggestions`);

        // Display final results
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
        });

        console.log('\n🎉 Trip generation complete! You can now test in the UI.');
        console.log('   The trips include real hotel data from SerpAPI.');

    } catch (error) {
        console.error('❌ Error running trip engine:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the trip engine
runSimpleTripEngine(); 