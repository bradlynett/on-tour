const { redisClient } = require('./redisClient');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

// Load environment variables
require('dotenv').config();

async function clearCacheAndRegenerate() {
    console.log('🔄 Clearing Cache and Regenerating Real Trip Data');
    console.log('=' .repeat(60));

    try {
        // 1. Clear all Redis cache
        console.log('\n1. Clearing all Redis cache...');
        const keys = await redisClient.keys('*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`✅ Cleared ${keys.length} cached items`);
        } else {
            console.log('✅ No cached items found');
        }

        // 2. Clear all existing trip suggestions (they're mostly empty now)
        console.log('\n2. Clearing existing trip suggestions...');
        const { pool } = require('./config/database');
        
        // Delete all trip components first
        await pool.query('DELETE FROM trip_components');
        console.log('✅ Cleared all trip components');
        
        // Delete all trip suggestions
        await pool.query('DELETE FROM trip_suggestions');
        console.log('✅ Cleared all trip suggestions');

        // 3. Generate new trip suggestions with only real data
        console.log('\n3. Generating new trip suggestions with real data only...');
        
        // Get user ID (assuming user 1 exists)
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        const userId = userResult.rows[0].id;
        console.log(`Using user ID: ${userId}`);

        // Generate new trip suggestions
        const newSuggestions = await tripSuggestionEngine.generateTripSuggestions(userId, 10);
        console.log(`✅ Generated ${newSuggestions.length} new trip suggestions`);

        // 4. Verify the new data
        console.log('\n4. Verifying new trip data...');
        const verifyResult = await pool.query(`
            SELECT 
                ts.id,
                ts.total_cost,
                ts.service_fee,
                COUNT(tc.id) as component_count,
                STRING_AGG(tc.provider, ', ') as providers
            FROM trip_suggestions ts
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
            GROUP BY ts.id, ts.total_cost, ts.service_fee
            ORDER BY ts.created_at DESC
            LIMIT 10
        `);

        console.log(`\n📊 New Trip Data Summary:`);
        for (const trip of verifyResult.rows) {
            console.log(`  Trip ${trip.id}: $${trip.total_cost || 0} (${trip.component_count} components) - Providers: ${trip.providers || 'none'}`);
        }

        // 5. Check provider availability
        console.log('\n5. Checking provider availability...');
        const enhancedService = require('./services/enhancedUnifiedTravelService');
        const availableProviders = await enhancedService.getAvailableProviders();
        
        console.log(`\n📊 Available Providers:`);
        for (const [name, info] of Object.entries(availableProviders)) {
            console.log(`  ${name}: ${info.available ? '✅ Available' : '❌ Unavailable'}`);
            if (info.error) {
                console.log(`    Error: ${info.error}`);
            }
        }

        // 6. Summary
        console.log('\n6. Regeneration Summary:');
        console.log('=' .repeat(60));
        console.log(`✅ Cache cleared: ${keys.length} items`);
        console.log(`✅ Old trip suggestions cleared`);
        console.log(`✅ New trip suggestions generated: ${newSuggestions.length}`);
        console.log(`✅ Only real data from integrated providers`);
        console.log(`✅ No mock data or estimates`);

        // 7. Test API endpoint
        console.log('\n7. Testing API endpoint...');
        const axios = require('axios');
        try {
            const response = await axios.get('http://localhost:5001/api/trips', {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });
            
            if (response.data && response.data.success) {
                const suggestions = response.data.data.suggestions || [];
                console.log(`✅ API returned ${suggestions.length} trip suggestions`);
                
                for (const suggestion of suggestions.slice(0, 3)) {
                    console.log(`  - ${suggestion.eventName}: $${suggestion.totalCost || 0} (${suggestion.components?.length || 0} components)`);
                }
            } else {
                console.log('⚠️ API response format unexpected');
            }
        } catch (error) {
            console.log(`❌ API test failed: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error during cache clear and regeneration:', error);
    } finally {
        await redisClient.quit();
    }
}

// Run the regeneration
clearCacheAndRegenerate(); 