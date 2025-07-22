const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');
require('dotenv').config();

// Set up environment variables if not present (for testing)
if (!process.env.SERPAPI_KEY) {
    console.log('⚠️ SERPAPI_KEY not found, using placeholder for testing');
    process.env.SERPAPI_KEY = 'test_key';
}

if (!process.env.AMADEUS_CLIENT_ID) {
    console.log('⚠️ AMADEUS_CLIENT_ID not found, using placeholder for testing');
    process.env.AMADEUS_CLIENT_ID = 'test_client_id';
}

if (!process.env.AMADEUS_CLIENT_SECRET) {
    console.log('⚠️ AMADEUS_CLIENT_SECRET not found, using placeholder for testing');
    process.env.AMADEUS_CLIENT_SECRET = 'test_client_secret';
}

async function runTripEngineForAllUsers() {
    console.log('🎵 Running Trip Suggestion Engine for All Users');
    console.log('=' .repeat(60));

    try {
        // Clear cache first
        console.log('\n1. Clearing cache...');
        const keys = await redisClient.keys('*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`   ✅ Cleared ${keys.length} cached entries`);
        }

        // Get all users
        console.log('\n2. Getting all users...');
        const usersResult = await pool.query(`
            SELECT id, email, city, state 
            FROM users 
            ORDER BY id
        `);

        console.log(`   ✅ Found ${usersResult.rows.length} users`);

        // Import the trip suggestion engine
        console.log('\n3. Loading trip suggestion engine...');
        const tripSuggestionEngine = require('./services/tripSuggestionEngine');

        // Generate trips for each user
        console.log('\n4. Generating trip suggestions...');
        
        for (const user of usersResult.rows) {
            try {
                console.log(`\n   🎵 Processing user ${user.id}: ${user.email}`);
                console.log(`      Location: ${user.city}, ${user.state}`);
                
                // Generate 3 trip suggestions per user
                const tripSuggestions = await tripSuggestionEngine.generateTripSuggestions(user.id, 3);
                
                console.log(`      ✅ Generated ${tripSuggestions.length} trip suggestions`);
                
                if (tripSuggestions.length > 0) {
                    tripSuggestions.forEach((trip, idx) => {
                        console.log(`         Trip ${idx + 1}: ${trip.event_artist} - $${trip.total_cost || 'N/A'}`);
                    });
                }
                
            } catch (error) {
                console.log(`      ❌ Error for user ${user.id}: ${error.message}`);
            }
        }

        console.log('\n🎉 Trip generation complete for all users!');
        console.log('   You can now test in the UI with fresh trip data.');

    } catch (error) {
        console.error('❌ Error running trip engine:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the trip engine
runTripEngineForAllUsers(); 