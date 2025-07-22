const { pool } = require('./config/database');
const { redisClient } = require('./redisClient');

// Load environment variables
require('dotenv').config();

async function fixTripCosts() {
    console.log('🔧 Fixing Trip Costs and Pricing');
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

        let fixedCount = 0;
        let totalFixedCost = 0;

        for (const trip of tripResult.rows) {
            console.log(`\n🔍 Processing Trip ID: ${trip.id}`);
            console.log(`  Event: ${trip.event_name} by ${trip.artist}`);
            console.log(`  Current Total Cost: $${trip.total_cost || 0}`);
            console.log(`  Current Service Fee: $${trip.service_fee || 0}`);

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

            let componentTotal = 0;
            let hasRealPricing = false;
            let updatedComponents = [];

            for (const comp of componentResult.rows) {
                console.log(`    ${comp.component_type.toUpperCase()}:`);
                console.log(`      Provider: ${comp.provider}`);
                console.log(`      Current Price: $${comp.price || 0}`);
                console.log(`      Booking Ref: ${comp.booking_reference || 'N/A'}`);

                // Parse details to check for real pricing
                let details = null;
                try {
                    details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                } catch (e) {
                    details = comp.details;
                }

                // Check if this is real pricing or mock data
                const isRealPricing = comp.price && comp.price > 0 && 
                                    comp.provider && 
                                    !comp.provider.includes('mock') &&
                                    comp.provider !== 'skyscanner' && // Mock provider
                                    comp.provider !== 'bookingcom' && // Mock provider
                                    comp.provider !== 'agoda'; // Mock provider

                if (isRealPricing) {
                    hasRealPricing = true;
                    componentTotal += comp.price;
                    console.log(`      ✅ Real pricing: $${comp.price}`);
                } else {
                    console.log(`      ⚠️ Mock/zero pricing: $${comp.price || 0}`);
                    
                    // Try to get real pricing from cache or generate estimated pricing
                    let estimatedPrice = 0;
                    
                    if (comp.component_type === 'ticket') {
                        estimatedPrice = 75; // Average ticket price
                    } else if (comp.component_type === 'flight') {
                        estimatedPrice = 250; // Average flight price
                    } else if (comp.component_type === 'hotel') {
                        estimatedPrice = 150; // Average hotel price per night
                    } else if (comp.component_type === 'car') {
                        estimatedPrice = 50; // Average car rental price per day
                    }

                    // Update component with estimated pricing
                    if (estimatedPrice > 0) {
                        await pool.query(`
                            UPDATE trip_components 
                            SET price = $2, 
                                details = jsonb_set(
                                    COALESCE(details, '{}'::jsonb), 
                                    '{priceType}', '"estimated"'
                                )
                            WHERE id = $1
                        `, [comp.id, estimatedPrice]);

                        componentTotal += estimatedPrice;
                        console.log(`      📝 Updated with estimated price: $${estimatedPrice}`);
                    }
                }
            }

            // 3. Calculate new total cost and service fee
            const newTotalCost = componentTotal;
            const newServiceFee = Math.max(newTotalCost * 0.05, 25); // 5% or $25 minimum

            console.log(`  Calculated Total: $${newTotalCost}`);
            console.log(`  Calculated Service Fee: $${newServiceFee}`);

            // 4. Update trip suggestion if costs changed
            if (newTotalCost !== (trip.total_cost || 0) || newServiceFee !== (trip.service_fee || 0)) {
                await pool.query(`
                    UPDATE trip_suggestions 
                    SET total_cost = $2, 
                        service_fee = $3, 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [trip.id, newTotalCost, newServiceFee]);

                console.log(`  ✅ Updated trip costs`);
                fixedCount++;
                totalFixedCost += newTotalCost;
            } else {
                console.log(`  ✅ No changes needed`);
            }
        }

        // 5. Summary
        console.log('\n5. Fix Summary:');
        console.log('=' .repeat(60));
        console.log(`✅ Processed ${tripResult.rows.length} trip suggestions`);
        console.log(`✅ Fixed ${fixedCount} trip costs`);
        console.log(`💰 Total fixed cost: $${totalFixedCost.toFixed(2)}`);
        console.log(`📊 Average cost per trip: $${(totalFixedCost / Math.max(fixedCount, 1)).toFixed(2)}`);

        // 6. Verify the fixes
        console.log('\n6. Verifying fixes...');
        const verifyResult = await pool.query(`
            SELECT 
                COUNT(*) as total_trips,
                AVG(total_cost) as avg_cost,
                MIN(total_cost) as min_cost,
                MAX(total_cost) as max_cost,
                COUNT(CASE WHEN total_cost > 0 THEN 1 END) as trips_with_cost
            FROM trip_suggestions
        `);

        const stats = verifyResult.rows[0];
        console.log(`📊 Verification Results:`);
        console.log(`  Total trips: ${stats.total_trips}`);
        console.log(`  Average cost: $${parseFloat(stats.avg_cost || 0).toFixed(2)}`);
        console.log(`  Min cost: $${parseFloat(stats.min_cost || 0).toFixed(2)}`);
        console.log(`  Max cost: $${parseFloat(stats.max_cost || 0).toFixed(2)}`);
        console.log(`  Trips with cost > 0: ${stats.trips_with_cost}/${stats.total_trips}`);

    } catch (error) {
        console.error('❌ Error fixing trip costs:', error);
    } finally {
        await pool.end();
        await redisClient.quit();
    }
}

// Run the fix
fixTripCosts(); 