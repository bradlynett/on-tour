const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');

// Load environment variables
require('dotenv').config();

async function checkCurrentTripData() {
    console.log('🔍 Checking Current Trip Data');
    console.log('=' .repeat(60));

    try {
        // 1. Check trip suggestions
        console.log('\n1. Trip Suggestions:');
        const tripResult = await pool.query(`
            SELECT 
                ts.id,
                ts.user_id,
                ts.event_id,
                ts.total_cost,
                ts.service_fee,
                ts.status,
                ts.created_at,
                e.name as event_name,
                e.artist,
                e.venue_name,
                e.venue_city,
                e.venue_state,
                e.event_date
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            ORDER BY ts.created_at DESC
            LIMIT 5
        `);

        console.log(`Found ${tripResult.rows.length} trip suggestions`);
        
        for (const trip of tripResult.rows) {
            console.log(`\nTrip ID: ${trip.id}`);
            console.log(`  Event: ${trip.event_name} by ${trip.artist}`);
            console.log(`  Venue: ${trip.venue_name}, ${trip.venue_city}, ${trip.venue_state}`);
            console.log(`  Date: ${trip.event_date}`);
            console.log(`  Total Cost: $${trip.total_cost || 0}`);
            console.log(`  Service Fee: $${trip.service_fee || 0}`);
            console.log(`  Status: ${trip.status}`);

            // 2. Check trip components for this trip
            const componentResult = await pool.query(`
                SELECT 
                    tc.id,
                    tc.component_type,
                    tc.provider,
                    tc.price,
                    tc.details,
                    tc.booking_reference,
                    tc.created_at
                FROM trip_components tc
                WHERE tc.trip_suggestion_id = $1
                ORDER BY tc.component_type
            `, [trip.id]);

            console.log(`  Components (${componentResult.rows.length}):`);
            
            let totalComponentCost = 0;
            for (const comp of componentResult.rows) {
                console.log(`    ${comp.component_type.toUpperCase()}:`);
                console.log(`      Provider: ${comp.provider}`);
                console.log(`      Price: $${comp.price || 0}`);
                console.log(`      Booking Ref: ${comp.booking_reference || 'N/A'}`);
                
                if (comp.details) {
                    try {
                        const details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                        console.log(`      Details: ${JSON.stringify(details, null, 6)}`);
                    } catch (e) {
                        console.log(`      Details: ${comp.details}`);
                    }
                }
                
                totalComponentCost += comp.price || 0;
            }
            
            console.log(`    Calculated Total: $${totalComponentCost}`);
            console.log(`    Stored Total: $${trip.total_cost || 0}`);
            console.log(`    Difference: $${(trip.total_cost || 0) - totalComponentCost}`);
        }

        // 3. Check user feedback
        console.log('\n2. User Feedback:');
        const feedbackResult = await pool.query(`
            SELECT 
                utf.user_id,
                utf.trip_suggestion_id,
                utf.feedback,
                utf.created_at
            FROM user_trip_feedback utf
            ORDER BY utf.created_at DESC
            LIMIT 10
        `);

        console.log(`Found ${feedbackResult.rows.length} feedback records`);
        for (const feedback of feedbackResult.rows) {
            console.log(`  User ${feedback.user_id} -> Trip ${feedback.trip_suggestion_id}: ${feedback.feedback}`);
        }

        // 4. Check saved trips
        console.log('\n3. Saved Trips:');
        const savedResult = await pool.query(`
            SELECT 
                ust.user_id,
                ust.trip_suggestion_id,
                ust.created_at
            FROM user_saved_trips ust
            ORDER BY ust.created_at DESC
            LIMIT 10
        `);

        console.log(`Found ${savedResult.rows.length} saved trip records`);
        for (const saved of savedResult.rows) {
            console.log(`  User ${saved.user_id} saved Trip ${saved.trip_suggestion_id}`);
        }

        // 5. Check provider data in cache
        console.log('\n4. Provider Cache Data:');
        const cacheKeys = await redisClient.keys('*');
        const providerKeys = cacheKeys.filter(key => 
            key.includes('serpapi') || 
            key.includes('seatgeek') || 
            key.includes('ticketmaster') || 
            key.includes('amadeus') ||
            key.includes('skyscanner') ||
            key.includes('booking') ||
            key.includes('agoda')
        );

        console.log(`Found ${providerKeys.length} provider cache keys`);
        for (const key of providerKeys.slice(0, 5)) { // Show first 5
            const data = await redisClient.get(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`  ${key}: ${Array.isArray(parsed) ? parsed.length : 1} results`);
                } catch (e) {
                    console.log(`  ${key}: Raw data`);
                }
            }
        }

        console.log('\n5. Summary:');
        console.log('=' .repeat(60));
        console.log('✅ Database queries completed');
        console.log('✅ Cache data checked');
        console.log('✅ Provider data analyzed');
        
        if (tripResult.rows.length > 0) {
            const avgCost = tripResult.rows.reduce((sum, trip) => sum + (trip.total_cost || 0), 0) / tripResult.rows.length;
            console.log(`📊 Average trip cost: $${avgCost.toFixed(2)}`);
        }

    } catch (error) {
        console.error('❌ Error checking trip data:', error);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the check
checkCurrentTripData(); 