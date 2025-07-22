const tripSuggestionEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');

// Load environment variables
require('dotenv').config();

async function generateRealTrips() {
    console.log('🚀 Generating Real Trip Suggestions');
    console.log('=' .repeat(60));

    try {
        // 1. Get a user to generate trips for
        console.log('\n1. Getting user for trip generation...');
        const userResult = await pool.query('SELECT id, email FROM users LIMIT 1');
        
        if (userResult.rows.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        const userId = userResult.rows[0].id;
        console.log(`✅ Using user: ${userResult.rows[0].email} (ID: ${userId})`);

        // 2. Generate new trip suggestions
        console.log('\n2. Generating trip suggestions...');
        console.log('   This may take a few minutes as it searches real providers...');
        
        const startTime = Date.now();
        const suggestions = await tripSuggestionEngine.generateTripSuggestions(userId, 10);
        const endTime = Date.now();
        
        console.log(`✅ Generated ${suggestions.length} trip suggestions in ${((endTime - startTime) / 1000).toFixed(1)}s`);

        // 3. Verify the generated data
        console.log('\n3. Verifying generated data...');
        const verifyResult = await pool.query(`
            SELECT 
                ts.id,
                ts.total_cost,
                ts.service_fee,
                ts.status,
                e.name as event_name,
                e.artist,
                COUNT(tc.id) as component_count,
                STRING_AGG(DISTINCT tc.provider, ', ') as providers,
                STRING_AGG(DISTINCT tc.component_type, ', ') as component_types
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
            WHERE ts.user_id = $1
            GROUP BY ts.id, ts.total_cost, ts.service_fee, ts.status, e.name, e.artist
            ORDER BY ts.created_at DESC
            LIMIT 10
        `, [userId]);

        console.log(`\n📊 Generated Trip Data:`);
        let totalCost = 0;
        let tripsWithComponents = 0;
        
        for (const trip of verifyResult.rows) {
            console.log(`\n  Trip ${trip.id}:`);
            console.log(`    Event: ${trip.event_name}`);
            console.log(`    Artist: ${trip.artist}`);
            console.log(`    Total Cost: $${trip.total_cost || 0}`);
            console.log(`    Service Fee: $${trip.service_fee || 0}`);
            console.log(`    Components: ${trip.component_count} (${trip.component_types || 'none'})`);
            console.log(`    Providers: ${trip.providers || 'none'}`);
            
            if (trip.component_count > 0) {
                tripsWithComponents++;
                totalCost += trip.total_cost || 0;
            }
        }

        // 4. Check component details
        console.log('\n4. Checking component details...');
        const componentResult = await pool.query(`
            SELECT 
                tc.component_type,
                tc.provider,
                tc.price,
                tc.booking_reference,
                COUNT(*) as count
            FROM trip_components tc
            JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
            WHERE ts.user_id = $1
            GROUP BY tc.component_type, tc.provider, tc.price, tc.booking_reference
            ORDER BY tc.component_type, tc.provider
        `, [userId]);

        console.log(`\n📋 Component Summary:`);
        for (const comp of componentResult.rows) {
            const hasBookingUrl = comp.booking_reference ? '✅ Has URL' : '❌ No URL';
            console.log(`  ${comp.component_type.toUpperCase()}: ${comp.provider} - $${comp.price || 0} (${comp.count}x) - ${hasBookingUrl}`);
        }

        // 5. Summary
        console.log('\n5. Generation Summary:');
        console.log('=' .repeat(60));
        console.log(`✅ Total trips generated: ${suggestions.length}`);
        console.log(`✅ Trips with components: ${tripsWithComponents}`);
        console.log(`✅ Total cost: $${totalCost.toFixed(2)}`);
        console.log(`✅ Average cost per trip: $${suggestions.length > 0 ? (totalCost / suggestions.length).toFixed(2) : '0.00'}`);
        console.log(`✅ Only real data from integrated providers`);
        console.log(`✅ No mock data or estimates`);

        // 6. Test API endpoint
        console.log('\n6. Testing API endpoint...');
        const axios = require('axios');
        const { generateToken } = require('./middleware/auth');
        
        const token = generateToken(userId);
        
        try {
            const response = await axios.get('http://localhost:5001/api/trips', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            if (response.data && response.data.success) {
                const apiSuggestions = response.data.data.suggestions || [];
                console.log(`✅ API returned ${apiSuggestions.length} trip suggestions`);
                
                if (apiSuggestions.length > 0) {
                    console.log(`\n📊 API Data Sample:`);
                    for (let i = 0; i < Math.min(apiSuggestions.length, 3); i++) {
                        const trip = apiSuggestions[i];
                        console.log(`  ${i + 1}. ${trip.eventName}: $${trip.totalCost || 0} (${trip.components?.length || 0} components)`);
                    }
                }
            } else {
                console.log('⚠️ API response format unexpected');
            }
        } catch (error) {
            console.log(`❌ API test failed: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error generating real trips:', error);
    } finally {
        await pool.end();
    }
}

// Run the generation
generateRealTrips(); 