require('dotenv').config();

const TripSuggestionEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');

async function testFutureEventTrip() {
    console.log('🚀 Testing Future Event Trip with Real Data...');
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
        
        const preferences = prefResult.rows[0] || { primary_airport: 'DEN' };
        console.log('User preferences:', preferences);
        
        // Create a future event (3 months from now)
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 3);
        const futureEventDate = futureDate.toISOString().split('T')[0] + 'T20:00:00Z';
        
        console.log('Creating test event with future date:', futureEventDate);
        
        // Insert a test event
        const eventResult = await pool.query(`
            INSERT INTO events (name, artist, venue_name, venue_city, venue_state, event_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, artist, venue_name, venue_city, venue_state, event_date
        `, [
            'Test Concert 2025',
            'Test Artist',
            'Madison Square Garden',
            'New York',
            'NY',
            futureEventDate
        ]);
        
        const event = eventResult.rows[0];
        console.log('Created test event:', {
            id: event.id,
            name: event.name,
            artist: event.artist,
            venue: `${event.venue_name}, ${event.venue_city}, ${event.venue_state}`,
            date: event.event_date
        });
        
        // Test 1: Search travel options for future event
        console.log('\n1️⃣ Searching travel options for future event...');
        const travelOptions = await TripSuggestionEngine.searchTravelOptions(event, preferences);
        
        console.log('Travel options found:');
        Object.entries(travelOptions).forEach(([type, options]) => {
            console.log(`  ${type}: ${Array.isArray(options) ? options.length : 0} options`);
            if (Array.isArray(options) && options.length > 0) {
                options.forEach((option, index) => {
                    console.log(`    ${index + 1}. ${option.provider || option.searchProvider} - $${option.price?.total || option.price}`);
                    if (option.searchProvider) {
                        console.log(`       Search Provider: ${option.searchProvider}`);
                    }
                    if (option.priceType) {
                        console.log(`       Price Type: ${option.priceType}`);
                    }
                    if (option.bookingUrl || option.booking_url || option.url) {
                        console.log(`       Has Booking URL: ✅ YES`);
                    }
                });
            }
        });
        
        // Test 2: Create trip suggestion with future event
        console.log('\n2️⃣ Creating trip suggestion with future event...');
        const tripSuggestion = await TripSuggestionEngine.createTripSuggestion(userId, event.id, preferences);
        
        if (tripSuggestion) {
            console.log('✅ Trip suggestion created!');
            console.log(`  ID: ${tripSuggestion.id}`);
            console.log(`  Total Cost: $${tripSuggestion.total_cost}`);
            console.log(`  Service Fee: $${tripSuggestion.service_fee}`);
            console.log(`  Components: ${tripSuggestion.components?.length || 0}`);
            
            if (tripSuggestion.components) {
                console.log('\nComponents:');
                tripSuggestion.components.forEach((comp, index) => {
                    console.log(`  ${index + 1}. ${comp.component_type}:`);
                    console.log(`     Provider: ${comp.provider}`);
                    console.log(`     Search Provider: ${comp.searchProvider || 'N/A'}`);
                    console.log(`     Price: $${comp.price}`);
                    console.log(`     Price Type: ${comp.priceType || 'real'}`);
                    
                    const hasBookingUrl = comp.bookingUrl || 
                                        comp.booking_url || 
                                        comp.url ||
                                        (comp.enrichedDetails && (
                                          comp.enrichedDetails.bookingUrl || 
                                          comp.enrichedDetails.booking_url || 
                                          comp.enrichedDetails.url
                                        ));
                    
                    console.log(`     Has Booking URL: ${hasBookingUrl ? '✅ YES' : '❌ NO'}`);
                    
                    if (hasBookingUrl) {
                        const bookingUrl = comp.bookingUrl || 
                                         comp.booking_url || 
                                         comp.url ||
                                         (comp.enrichedDetails && (
                                           comp.enrichedDetails.bookingUrl || 
                                           comp.enrichedDetails.booking_url || 
                                           comp.enrichedDetails.url
                                         ));
                        console.log(`     Booking URL: ${bookingUrl}`);
                    }
                });
            }
        }
        
        // Clean up: Delete the test event
        console.log('\n🧹 Cleaning up test event...');
        await pool.query('DELETE FROM events WHERE id = $1', [event.id]);
        console.log('✅ Test event cleaned up');
        
        console.log('\n🎉 Future event trip test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testFutureEventTrip().catch(console.error); 