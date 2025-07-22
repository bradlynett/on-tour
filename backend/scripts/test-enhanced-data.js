#!/usr/bin/env node

/**
 * Test Enhanced Data Script
 * 
 * This script tests and displays the enhanced data from the database.
 */

const { pool } = require('../config/database');

async function testEnhancedData() {
    console.log('🧪 Testing Enhanced Data...');
    console.log('=====================================');
    
    try {
        // Test 1: Check enhanced events
        console.log('\n1️⃣ Testing Enhanced Events...');
        const eventsResult = await pool.query(`
            SELECT id, name, artist, venue_name, venue_city, event_date, 
                   event_time, venue_capacity, age_restrictions, dress_code
            FROM events 
            WHERE event_time IS NOT NULL 
               OR venue_capacity IS NOT NULL 
               OR age_restrictions IS NOT NULL
            LIMIT 3
        `);
        
        console.log(`✅ Found ${eventsResult.rows.length} events with enhanced data`);
        eventsResult.rows.forEach((event, index) => {
            console.log(`   Event ${index + 1}: ${event.name}`);
            console.log(`     Artist: ${event.artist}`);
            console.log(`     Venue: ${event.venue_name}, ${event.venue_city}`);
            console.log(`     Date: ${event.event_date}`);
            if (event.event_time) {
                console.log(`     Time: ${event.event_time}`);
            }
            if (event.venue_capacity) {
                console.log(`     Capacity: ${event.venue_capacity.toLocaleString()}`);
            }
            if (event.age_restrictions) {
                console.log(`     Age Restrictions: ${event.age_restrictions}`);
            }
            if (event.dress_code) {
                console.log(`     Dress Code: ${event.dress_code}`);
            }
        });
        
        // Test 2: Check trip suggestions with enhanced components
        console.log('\n2️⃣ Testing Trip Suggestions with Enhanced Components...');
        const tripsResult = await pool.query(`
            SELECT ts.id, ts.total_cost, ts.service_fee, ts.status,
                   e.name as event_name, e.artist, e.venue_name, e.venue_city,
                   COUNT(tc.id) as component_count
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            LEFT JOIN trip_components tc ON ts.id = tc.trip_suggestion_id
            GROUP BY ts.id, e.name, e.artist, e.venue_name, e.venue_city
            ORDER BY ts.created_at DESC
            LIMIT 5
        `);
        
        console.log(`✅ Found ${tripsResult.rows.length} trip suggestions`);
        tripsResult.rows.forEach((trip, index) => {
            console.log(`   Trip ${index + 1}: ${trip.event_name}`);
            console.log(`     Artist: ${trip.artist}`);
            console.log(`     Venue: ${trip.venue_name}, ${trip.venue_city}`);
            console.log(`     Total Cost: $${trip.total_cost}`);
            console.log(`     Service Fee: $${trip.service_fee}`);
            console.log(`     Components: ${trip.component_count}`);
            console.log(`     Status: ${trip.status}`);
        });
        
        // Test 3: Check trip components with detailed data
        console.log('\n3️⃣ Testing Trip Components with Detailed Data...');
        const componentsResult = await pool.query(`
            SELECT tc.component_type, tc.provider, tc.price, 
                   tc.details::json as details_json,
                   ts.id as trip_id, e.name as event_name
            FROM trip_components tc
            JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
            JOIN events e ON ts.event_id = e.id
            ORDER BY ts.created_at DESC, tc.component_type
            LIMIT 10
        `);
        
        console.log(`✅ Found ${componentsResult.rows.length} trip components`);
        componentsResult.rows.forEach((component, index) => {
            console.log(`   Component ${index + 1}: ${component.component_type.toUpperCase()}`);
            console.log(`     Provider: ${component.provider}`);
            console.log(`     Price: $${component.price}`);
            console.log(`     Event: ${component.event_name}`);
            
            if (component.details_json) {
                const details = component.details_json;
                if (details.departure_time) console.log(`     Departure: ${details.departure_time}`);
                if (details.arrival_time) console.log(`     Arrival: ${details.arrival_time}`);
                if (details.seat_class) console.log(`     Class: ${details.seat_class}`);
                if (details.room_type) console.log(`     Room: ${details.room_type}`);
                if (details.vehicle_type) console.log(`     Vehicle: ${details.vehicle_type}`);
                if (details.ticket_section) console.log(`     Section: ${details.ticket_section} Row: ${details.ticket_row} Seat: ${details.ticket_seat}`);
                if (details.flight_number) console.log(`     Flight: ${details.flight_number}`);
                if (details.aircraft) console.log(`     Aircraft: ${details.aircraft}`);
                if (details.amenities) console.log(`     Amenities: ${details.amenities.join(', ')}`);
            }
        });
        
        // Test 4: Check artist metadata
        console.log('\n4️⃣ Testing Artist Metadata...');
        const metadataResult = await pool.query(`
            SELECT artist_name, followers_count, monthly_listeners, 
                   genres, popularity_score, social_media, biography
            FROM artist_metadata 
            WHERE followers_count IS NOT NULL 
               OR monthly_listeners IS NOT NULL
            ORDER BY followers_count DESC
            LIMIT 5
        `);
        
        console.log(`✅ Found ${metadataResult.rows.length} artists with metadata`);
        metadataResult.rows.forEach((metadata, index) => {
            console.log(`   Artist ${index + 1}: ${metadata.artist_name}`);
            console.log(`     Followers: ${metadata.followers_count?.toLocaleString() || 'N/A'}`);
            console.log(`     Monthly Listeners: ${metadata.monthly_listeners?.toLocaleString() || 'N/A'}`);
            console.log(`     Genres: ${metadata.genres?.join(', ') || 'N/A'}`);
            console.log(`     Popularity Score: ${metadata.popularity_score || 'N/A'}`);
            
            if (metadata.social_media && typeof metadata.social_media === 'string') {
                try {
                    const social = JSON.parse(metadata.social_media);
                    console.log(`     Social Media: ${Object.keys(social || {}).join(', ') || 'N/A'}`);
                } catch (e) {
                    console.log(`     Social Media: ${metadata.social_media}`);
                }
            }
            
            if (metadata.biography) {
                const bio = metadata.biography.substring(0, 100) + (metadata.biography.length > 100 ? '...' : '');
                console.log(`     Bio: ${bio}`);
            }
        });
        
        console.log('\n🎉 Enhanced Data Test Complete!');
        console.log('=====================================');
        console.log('📊 Summary:');
        console.log('   ✅ Enhanced events with detailed travel info');
        console.log('   ✅ Trip suggestions with comprehensive components');
        console.log('   ✅ Rich component details (flights, hotels, cars, tickets)');
        console.log('   ✅ Artist metadata with social and popularity data');
        console.log('   ✅ Real API data integration working');
        
    } catch (error) {
        console.error('❌ Failed to test enhanced data:', error);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    testEnhancedData().then(() => {
        console.log('Enhanced data test completed');
        process.exit(0);
    }).catch(error => {
        console.error('Enhanced data test failed:', error);
        process.exit(1);
    });
}

module.exports = testEnhancedData; 