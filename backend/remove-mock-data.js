const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');

// Load environment variables
require('dotenv').config();

async function removeMockData() {
    console.log('🧹 Removing All Mock Data and Estimates');
    console.log('=' .repeat(60));

    try {
        // 1. Get all trip suggestions
        console.log('\n1. Getting all trip suggestions...');
        const tripResult = await pool.query(`
            SELECT 
                ts.id,
                ts.user_id,
                ts.event_id,
                ts.total_cost,
                ts.service_fee,
                ts.status,
                e.name as event_name,
                e.artist,
                e.venue_city,
                e.venue_state
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            ORDER BY ts.created_at DESC
        `);

        console.log(`Found ${tripResult.rows.length} trip suggestions`);

        let tripsWithRealData = 0;
        let tripsWithOnlyMockData = 0;
        let totalRealCost = 0;

        for (const trip of tripResult.rows) {
            console.log(`\n🔍 Processing Trip ID: ${trip.id}`);
            console.log(`  Event: ${trip.event_name} by ${trip.artist}`);

            // 2. Get components for this trip
            const componentResult = await pool.query(`
                SELECT 
                    tc.id,
                    tc.component_type,
                    tc.provider,
                    tc.price,
                    tc.details,
                    tc.booking_reference
                FROM trip_components tc
                WHERE tc.trip_suggestion_id = $1
                ORDER BY tc.component_type
            `, [trip.id]);

            console.log(`  Components found: ${componentResult.rows.length}`);

            let realComponents = [];
            let mockComponents = [];

            for (const comp of componentResult.rows) {
                console.log(`    ${comp.component_type.toUpperCase()}:`);
                console.log(`      Provider: ${comp.provider}`);
                console.log(`      Price: $${comp.price || 0}`);
                console.log(`      Booking Ref: ${comp.booking_reference || 'N/A'}`);

                // Parse details to check for real vs mock data
                let details = null;
                try {
                    details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                } catch (e) {
                    details = comp.details;
                }

                // Check if this is REAL data from integrated providers
                const isRealData = comp.price && comp.price > 0 && 
                                 comp.provider && 
                                 !comp.provider.includes('mock') &&
                                 comp.provider !== 'skyscanner' && // Mock provider
                                 comp.provider !== 'bookingcom' && // Mock provider
                                 comp.provider !== 'agoda' && // Mock provider
                                 comp.booking_reference && // Must have booking URL
                                 (comp.provider === 'ticketmaster' || 
                                  comp.provider === 'seatgeek' || 
                                  comp.provider === 'serpapi' || 
                                  comp.provider === 'amadeus');

                if (isRealData) {
                    realComponents.push(comp);
                    console.log(`      ✅ REAL DATA: $${comp.price}`);
                } else {
                    mockComponents.push(comp);
                    console.log(`      ❌ MOCK/ESTIMATED: $${comp.price || 0}`);
                }
            }

            // 3. Remove mock components
            if (mockComponents.length > 0) {
                console.log(`  🗑️ Removing ${mockComponents.length} mock components...`);
                for (const mockComp of mockComponents) {
                    await pool.query(`
                        DELETE FROM trip_components 
                        WHERE id = $1
                    `, [mockComp.id]);
                }
            }

            // 4. Recalculate total cost with only real data
            const realTotalCost = realComponents.reduce((sum, comp) => sum + (comp.price || 0), 0);
            const realServiceFee = Math.max(realTotalCost * 0.05, 25); // 5% or $25 minimum

            console.log(`  Real components: ${realComponents.length}`);
            console.log(`  Real total cost: $${realTotalCost}`);
            console.log(`  Real service fee: $${realServiceFee}`);

            // 5. Update trip suggestion with real costs
            await pool.query(`
                UPDATE trip_suggestions 
                SET total_cost = $2, 
                    service_fee = $3, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [trip.id, realTotalCost, realServiceFee]);

            // 6. Track statistics
            if (realComponents.length > 0) {
                tripsWithRealData++;
                totalRealCost += realTotalCost;
                console.log(`  ✅ Trip has real data`);
            } else {
                tripsWithOnlyMockData++;
                console.log(`  ⚠️ Trip has no real data - will be empty`);
            }
        }

        // 7. Summary
        console.log('\n7. Cleanup Summary:');
        console.log('=' .repeat(60));
        console.log(`✅ Processed ${tripResult.rows.length} trip suggestions`);
        console.log(`✅ Trips with real data: ${tripsWithRealData}`);
        console.log(`⚠️ Trips with only mock data: ${tripsWithOnlyMockData}`);
        console.log(`💰 Total real cost: $${totalRealCost.toFixed(2)}`);
        console.log(`📊 Average real cost per trip: $${(totalRealCost / Math.max(tripsWithRealData, 1)).toFixed(2)}`);

        // 8. Verify the cleanup
        console.log('\n8. Verifying cleanup...');
        const verifyResult = await pool.query(`
            SELECT 
                COUNT(*) as total_trips,
                AVG(total_cost) as avg_cost,
                MIN(total_cost) as min_cost,
                MAX(total_cost) as max_cost,
                COUNT(CASE WHEN total_cost > 0 THEN 1 END) as trips_with_cost,
                COUNT(CASE WHEN total_cost = 0 THEN 1 END) as trips_without_cost
            FROM trip_suggestions
        `);

        const stats = verifyResult.rows[0];
        console.log(`📊 Verification Results:`);
        console.log(`  Total trips: ${stats.total_trips}`);
        console.log(`  Average cost: $${parseFloat(stats.avg_cost || 0).toFixed(2)}`);
        console.log(`  Min cost: $${parseFloat(stats.min_cost || 0).toFixed(2)}`);
        console.log(`  Max cost: $${parseFloat(stats.max_cost || 0).toFixed(2)}`);
        console.log(`  Trips with cost > 0: ${stats.trips_with_cost}/${stats.total_trips}`);
        console.log(`  Trips with cost = 0: ${stats.trips_without_cost}/${stats.total_trips}`);

        // 9. Check remaining components
        const componentStats = await pool.query(`
            SELECT 
                provider,
                COUNT(*) as count,
                AVG(price) as avg_price
            FROM trip_components
            GROUP BY provider
            ORDER BY count DESC
        `);

        console.log(`\n📊 Remaining Components by Provider:`);
        for (const stat of componentStats.rows) {
            console.log(`  ${stat.provider}: ${stat.count} components, avg $${parseFloat(stat.avg_price || 0).toFixed(2)}`);
        }

    } catch (error) {
        console.error('❌ Error removing mock data:', error);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the cleanup
removeMockData(); 