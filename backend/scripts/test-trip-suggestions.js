// Test trip suggestions for a specific user
const { pool } = require('../config/database');
const tripSuggestionEngine = require('../services/tripSuggestionEngine');

async function testTripSuggestions() {
    try {
        console.log('🧪 Testing trip suggestions...');
        
        // Get a user with interests
        const userResult = await pool.query(`
            SELECT u.id, u.email, COUNT(ui.id) as interest_count
            FROM users u
            LEFT JOIN user_interests ui ON u.id = ui.user_id
            WHERE ui.interest_type = 'artist'
            GROUP BY u.id, u.email
            HAVING COUNT(ui.id) > 0
            ORDER BY interest_count DESC
            LIMIT 1
        `);

        if (userResult.rows.length === 0) {
            console.log('No users with artist interests found');
            return;
        }

        const user = userResult.rows[0];
        console.log(`Testing for user: ${user.email} (ID: ${user.id}) with ${user.interest_count} interests`);

        // Get user interests
        const interestsResult = await pool.query(`
            SELECT interest_type, interest_value, priority
            FROM user_interests 
            WHERE user_id = $1 AND interest_type = 'artist'
            ORDER BY priority ASC
        `, [user.id]);

        console.log('User interests:');
        interestsResult.rows.forEach(interest => {
            console.log(`  - ${interest.interest_value} (${interest.interest_type})`);
        });

        // Check if there are matching events
        const eventsResult = await pool.query(`
            SELECT COUNT(*) as event_count
            FROM events e
            JOIN user_interests ui ON LOWER(e.artist) LIKE LOWER('%' || ui.interest_value || '%')
            WHERE ui.user_id = $1 AND ui.interest_type = 'artist'
            AND e.event_date >= CURRENT_DATE
        `, [user.id]);

        console.log(`Matching events in database: ${eventsResult.rows[0].event_count}`);

        if (eventsResult.rows[0].event_count > 0) {
            // Generate trip suggestions
            console.log('\n🎯 Generating trip suggestions...');
            const suggestions = await tripSuggestionEngine.generateTripSuggestions(user.id, 3);
            
            console.log(`Generated ${suggestions.suggestions.length} suggestions`);
            console.log('Suggestions:', JSON.stringify(suggestions, null, 2));
        } else {
            console.log('No matching events found for user interests');
        }

    } catch (error) {
        console.error('❌ Error testing trip suggestions:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testTripSuggestions(); 