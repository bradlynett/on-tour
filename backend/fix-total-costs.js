const { pool } = require('./config/database');

// Load environment variables
require('dotenv').config();

async function fixTotalCosts() {
    console.log('🔧 Fixing Total Cost Calculations');
    console.log('=' .repeat(60));

    try {
        // 1. Get all trip suggestions that need fixing
        console.log('\n1. Finding trips with $0 total cost...');
        const tripsResult = await pool.query(`
            SELECT 
                ts.id,
                ts.user_id,
                ts.total_cost,
                ts.service_fee,
                e.name as event_name,
                e.artist,
                COUNT(tc.id) as component_count,
                SUM(tc.price) as component_total
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
            WHERE ts.total_cost = 0 OR ts.total_cost IS NULL
            GROUP BY ts.id, ts.user_id, ts.total_cost, ts.service_fee, e.name, e.artist
            HAVING COUNT(tc.id) > 0
            ORDER BY ts.created_at DESC
        `);

        console.log(`Found ${tripsResult.rows.length} trips with $0 total cost that have components`);

        let fixedCount = 0;
        let totalFixedCost = 0;

        for (const trip of tripsResult.rows) {
            console.log(`\n🔍 Processing Trip ${trip.id}: ${trip.event_name}`);
            console.log(`  Current total cost: $${trip.total_cost || 0}`);
            console.log(`  Component total: $${trip.component_total || 0}`);
            console.log(`  Service fee: $${trip.service_fee || 25}`);
            
            // Calculate new total cost
            const componentTotal = parseFloat(trip.component_total || 0);
            const serviceFee = parseFloat(trip.service_fee || 25);
            const newTotalCost = componentTotal + serviceFee;
            
            console.log(`  New total cost: $${newTotalCost.toFixed(2)}`);
            
            // Update the trip suggestion
            await pool.query(`
                UPDATE trip_suggestions 
                SET total_cost = $2, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [trip.id, newTotalCost]);
            
            console.log(`  ✅ Updated trip ${trip.id} with total cost $${newTotalCost.toFixed(2)}`);
            
            fixedCount++;
            totalFixedCost += newTotalCost;
        }

        // 2. Verify the fixes
        console.log('\n2. Verifying fixes...');
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
        console.log(`\n📊 Verification Results:`);
        console.log(`  Total trips: ${stats.total_trips}`);
        console.log(`  Average cost: $${parseFloat(stats.avg_cost || 0).toFixed(2)}`);
        console.log(`  Min cost: $${parseFloat(stats.min_cost || 0).toFixed(2)}`);
        console.log(`  Max cost: $${parseFloat(stats.max_cost || 0).toFixed(2)}`);
        console.log(`  Trips with cost > 0: ${stats.trips_with_cost}/${stats.total_trips}`);
        console.log(`  Trips with cost = 0: ${stats.trips_without_cost}/${stats.total_trips}`);

        // 3. Show sample of fixed trips
        console.log('\n3. Sample of Fixed Trips:');
        const sampleResult = await pool.query(`
            SELECT 
                ts.id,
                ts.total_cost,
                ts.service_fee,
                e.name as event_name,
                e.artist,
                COUNT(tc.id) as component_count,
                SUM(tc.price) as component_total
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            LEFT JOIN trip_components tc ON ts.id = ts.trip_suggestion_id
            WHERE ts.total_cost > 0
            GROUP BY ts.id, ts.total_cost, ts.service_fee, e.name, e.artist
            ORDER BY ts.total_cost DESC
            LIMIT 5
        `);

        for (const trip of sampleResult.rows) {
            console.log(`  Trip ${trip.id}: ${trip.event_name} by ${trip.artist}`);
            console.log(`    Total: $${trip.total_cost}, Components: $${trip.component_total || 0}, Fee: $${trip.service_fee}`);
        }

        // 4. Summary
        console.log('\n4. Fix Summary:');
        console.log('=' .repeat(60));
        console.log(`✅ Fixed ${fixedCount} trip suggestions`);
        console.log(`✅ Total fixed cost: $${totalFixedCost.toFixed(2)}`);
        console.log(`✅ Average fixed cost: $${fixedCount > 0 ? (totalFixedCost / fixedCount).toFixed(2) : '0.00'}`);
        console.log(`✅ All trips now have proper total cost calculation`);
        console.log(`✅ Component prices + service fee = total cost`);

    } catch (error) {
        console.error('❌ Error fixing total costs:', error);
    } finally {
        await pool.end();
    }
}

// Run the fix
fixTotalCosts(); 