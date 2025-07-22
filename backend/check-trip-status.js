const { pool } = require('./config/database');

// Load environment variables
require('dotenv').config();

async function checkTripStatus() {
    console.log('🔍 Checking Trip Status in Database');
    console.log('=' .repeat(60));

    try {
        // 1. Check total trip suggestions
        console.log('\n1. Trip Suggestions Count:');
        const tripCountResult = await pool.query(`
            SELECT COUNT(*) as total_trips
            FROM trip_suggestions
        `);
        console.log(`   Total trip suggestions: ${tripCountResult.rows[0].total_trips}`);

        // 2. Check trip suggestions by user
        console.log('\n2. Trip Suggestions by User:');
        const userTripsResult = await pool.query(`
            SELECT 
                u.email,
                COUNT(ts.id) as trip_count,
                AVG(ts.total_cost) as avg_cost,
                SUM(ts.total_cost) as total_cost
            FROM users u
            LEFT JOIN trip_suggestions ts ON u.id = ts.user_id
            GROUP BY u.id, u.email
            ORDER BY trip_count DESC
        `);
        
        for (const user of userTripsResult.rows) {
            console.log(`   ${user.email}: ${user.trip_count} trips, avg $${parseFloat(user.avg_cost || 0).toFixed(2)}, total $${parseFloat(user.total_cost || 0).toFixed(2)}`);
        }

        // 3. Check recent trip suggestions
        console.log('\n3. Recent Trip Suggestions:');
        const recentTripsResult = await pool.query(`
            SELECT 
                ts.id,
                ts.user_id,
                ts.total_cost,
                ts.service_fee,
                ts.status,
                ts.created_at,
                e.name as event_name,
                e.artist,
                COUNT(tc.id) as component_count
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
            GROUP BY ts.id, ts.user_id, ts.total_cost, ts.service_fee, ts.status, ts.created_at, e.name, e.artist
            ORDER BY ts.created_at DESC
            LIMIT 10
        `);

        for (const trip of recentTripsResult.rows) {
            console.log(`   Trip ${trip.id}: ${trip.event_name} by ${trip.artist}`);
            console.log(`     Cost: $${trip.total_cost || 0}, Fee: $${trip.service_fee || 0}, Components: ${trip.component_count}`);
            console.log(`     Status: ${trip.status}, Created: ${trip.created_at}`);
        }

        // 4. Check trip components
        console.log('\n4. Trip Components Summary:');
        const componentResult = await pool.query(`
            SELECT 
                tc.component_type,
                tc.provider,
                COUNT(*) as count,
                AVG(tc.price) as avg_price,
                COUNT(CASE WHEN tc.booking_reference IS NOT NULL THEN 1 END) as with_booking_url
            FROM trip_components tc
            GROUP BY tc.component_type, tc.provider
            ORDER BY tc.component_type, count DESC
        `);

        for (const comp of componentResult.rows) {
            const hasUrl = comp.with_booking_url > 0 ? '✅ Has URLs' : '❌ No URLs';
            console.log(`   ${comp.component_type.toUpperCase()}: ${comp.provider} - ${comp.count}x, avg $${parseFloat(comp.avg_price || 0).toFixed(2)} - ${hasUrl}`);
        }

        // 5. Check events
        console.log('\n5. Events Summary:');
        const eventResult = await pool.query(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT artist) as unique_artists,
                COUNT(CASE WHEN event_date > CURRENT_DATE THEN 1 END) as future_events
            FROM events
        `);
        
        const events = eventResult.rows[0];
        console.log(`   Total events: ${events.total_events}`);
        console.log(`   Unique artists: ${events.unique_artists}`);
        console.log(`   Future events: ${events.future_events}`);

        // 6. Check if any trips have real data
        console.log('\n6. Real Data Analysis:');
        const realDataResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT ts.id) as trips_with_components,
                COUNT(DISTINCT CASE WHEN tc.booking_reference IS NOT NULL THEN ts.id END) as trips_with_booking_urls,
                COUNT(DISTINCT CASE WHEN tc.price > 0 THEN ts.id END) as trips_with_prices,
                COUNT(DISTINCT CASE WHEN tc.provider NOT IN ('skyscanner', 'bookingcom', 'agoda') THEN ts.id END) as trips_with_real_providers
            FROM trip_suggestions ts
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
        `);
        
        const realData = realDataResult.rows[0];
        console.log(`   Trips with components: ${realData.trips_with_components}`);
        console.log(`   Trips with booking URLs: ${realData.trips_with_booking_urls}`);
        console.log(`   Trips with prices > 0: ${realData.trips_with_prices}`);
        console.log(`   Trips with real providers: ${realData.trips_with_real_providers}`);

    } catch (error) {
        console.error('❌ Error checking trip status:', error);
    } finally {
        await pool.end();
    }
}

// Run the check
checkTripStatus(); 