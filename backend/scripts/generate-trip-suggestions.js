#!/usr/bin/env node

/**
 * Generate Trip Suggestions Script
 * 
 * This script generates real trip suggestions with enhanced components for existing users.
 */

const { pool } = require('../config/database');
const tripEngine = require('../services/tripSuggestionEngine');

async function generateTripSuggestions() {
    console.log('🚀 Generating Trip Suggestions with Enhanced Data...');
    console.log('==================================================');
    
    try {
        // Get existing users with interests
        const usersResult = await pool.query(`
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
            FROM users u
            JOIN user_interests ui ON u.id = ui.user_id
            WHERE ui.interest_type IN ('artist', 'event_type', 'venue', 'city')
            ORDER BY u.id
            LIMIT 5
        `);
        
        if (usersResult.rows.length === 0) {
            console.log('❌ No users with interests found');
            return;
        }
        
        console.log(`Found ${usersResult.rows.length} users with interests`);
        
        let totalTrips = 0;
        
        for (const user of usersResult.rows) {
            try {
                console.log(`\n🎯 Generating trips for user: ${user.email} (ID: ${user.id})`);
                
                // Generate trip suggestions
                const tripSuggestions = await tripEngine.generateTripSuggestions(user.id, 3);
                
                if (tripSuggestions && tripSuggestions.length > 0) {
                    console.log(`  ✅ Generated ${tripSuggestions.length} trip suggestions`);
                    totalTrips += tripSuggestions.length;
                    
                    // Show details of first trip
                    const firstTrip = tripSuggestions[0];
                    console.log(`  📋 Sample trip: ${firstTrip.event?.name || 'Unknown Event'}`);
                    console.log(`     Total cost: $${firstTrip.total_cost || 0}`);
                    console.log(`     Components: ${firstTrip.components?.length || 0}`);
                    
                    if (firstTrip.components && firstTrip.components.length > 0) {
                        console.log('     Enhanced component details:');
                        firstTrip.components.forEach((comp, index) => {
                            console.log(`       ${index + 1}. ${comp.component_type}: $${comp.price} - ${comp.provider}`);
                            if (comp.departure_time) console.log(`          Departure: ${comp.departure_time}`);
                            if (comp.arrival_time) console.log(`          Arrival: ${comp.arrival_time}`);
                            if (comp.seat_class) console.log(`          Class: ${comp.seat_class}`);
                            if (comp.room_type) console.log(`          Room: ${comp.room_type}`);
                            if (comp.vehicle_type) console.log(`          Vehicle: ${comp.vehicle_type}`);
                            if (comp.ticket_section) console.log(`          Section: ${comp.ticket_section} Row: ${comp.ticket_row} Seat: ${comp.ticket_seat}`);
                        });
                    }
                } else {
                    console.log(`  ⚠️ No trip suggestions generated for user ${user.email}`);
                }
                
            } catch (error) {
                console.error(`  ❌ Error generating trips for user ${user.email}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Trip generation complete!`);
        console.log(`📊 Summary:`);
        console.log(`   - Users processed: ${usersResult.rows.length}`);
        console.log(`   - Total trips generated: ${totalTrips}`);
        console.log(`   - Enhanced data: Available in all components`);
        
    } catch (error) {
        console.error('❌ Failed to generate trip suggestions:', error);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    generateTripSuggestions().then(() => {
        console.log('Trip generation script completed');
        process.exit(0);
    }).catch(error => {
        console.error('Trip generation script failed:', error);
        process.exit(1);
    });
}

module.exports = generateTripSuggestions; 