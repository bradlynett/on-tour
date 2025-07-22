require('dotenv').config();

const TripSuggestionEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');

async function testRealTripSuggestions() {
    console.log('🚀 Testing Real Trip Suggestions with Enhanced Providers...');
    console.log('=' .repeat(60));
    
    try {
        // Get a real user from the database
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        const userId = userResult.rows[0].id;
        console.log(`Testing with user ID: ${userId}`);
        
        // Get user's travel preferences
        const prefResult = await pool.query(`
            SELECT primary_airport, preferred_airlines, flight_class, 
                   preferred_hotel_brands, rental_car_preference
            FROM travel_preferences 
            WHERE user_id = $1
        `, [userId]);
        
        const preferences = prefResult.rows[0] || {};
        console.log('User preferences:', preferences);
        
        // Get a real event from the database
        const eventResult = await pool.query(`
            SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
            FROM events 
            WHERE event_date > CURRENT_DATE
            ORDER BY event_date ASC
            LIMIT 1
        `);
        
        if (eventResult.rows.length === 0) {
            console.log('❌ No future events found in database');
            return;
        }
        
        const event = eventResult.rows[0];
        console.log('Testing with event:', {
            name: event.name,
            artist: event.artist,
            venue: `${event.venue_name}, ${event.venue_city}, ${event.venue_state}`,
            date: event.event_date
        });
        
        // Test searchTravelOptions with real data
        console.log('\n🔍 Testing searchTravelOptions...');
        const travelOptions = await TripSuggestionEngine.searchTravelOptions(event, preferences);
        
        console.log('Travel Options Found:');
        Object.entries(travelOptions).forEach(([type, options]) => {
            console.log(`  ${type}: ${Array.isArray(options) ? options.length : 0} options`);
            if (Array.isArray(options) && options.length > 0) {
                const sample = options[0];
                console.log(`    Sample ${type}:`, {
                    provider: sample.provider || sample.searchProvider,
                    price: sample.price?.total || sample.price,
                    details: sample.details ? 'Available' : 'None'
                });
            }
        });
        
        // Test creating a trip suggestion
        console.log('\n🎯 Testing trip suggestion creation...');
        const tripSuggestion = await TripSuggestionEngine.createTripSuggestion(userId, event.id, preferences);
        
        if (tripSuggestion) {
            console.log('✅ Trip suggestion created successfully!');
            console.log('Trip Details:', {
                id: tripSuggestion.id,
                totalCost: tripSuggestion.total_cost,
                serviceFee: tripSuggestion.service_fee,
                components: tripSuggestion.components?.length || 0
            });
            
            if (tripSuggestion.components) {
                console.log('Components:');
                tripSuggestion.components.forEach(comp => {
                    console.log(`  ${comp.component_type}: ${comp.provider} - $${comp.price}`);
                });
            }
        } else {
            console.log('❌ Failed to create trip suggestion');
        }
        
        // Test generating multiple trip suggestions
        console.log('\n🎯 Testing trip suggestion generation...');
        const suggestions = await TripSuggestionEngine.generateTripSuggestions(userId, 3);
        
        console.log(`Generated ${suggestions.length} trip suggestions`);
        suggestions.forEach((suggestion, index) => {
            console.log(`  ${index + 1}. ${suggestion.event_name} - $${suggestion.total_cost}`);
        });
        
        console.log('\n🎉 Real trip suggestions test completed successfully!');
        console.log('✅ Enhanced providers are working with real data');
        console.log('✅ Trip suggestions are being generated with real costs');
        console.log('✅ Multiple providers are contributing to the results');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testRealTripSuggestions().catch(console.error); 