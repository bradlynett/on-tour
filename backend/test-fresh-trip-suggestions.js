require('dotenv').config();

const TripSuggestionEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');

async function testFreshTripSuggestions() {
    console.log('🚀 Testing Fresh Trip Suggestions with Real Data...');
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
        
        // Test 1: Create a fresh trip suggestion
        console.log('\n1️⃣ Creating fresh trip suggestion...');
        const freshSuggestion = await TripSuggestionEngine.createTripSuggestion(userId, event.id, preferences);
        
        if (!freshSuggestion) {
            console.log('❌ Failed to create trip suggestion');
            return;
        }
        
        console.log('✅ Fresh trip suggestion created!');
        console.log(`  ID: ${freshSuggestion.id}`);
        console.log(`  Total Cost: $${freshSuggestion.total_cost}`);
        console.log(`  Service Fee: $${freshSuggestion.service_fee}`);
        console.log(`  Status: ${freshSuggestion.status}`);
        
        // Test 2: Get the trip suggestion with enhanced details
        console.log('\n2️⃣ Getting trip suggestion with enhanced details...');
        const detailedSuggestion = await TripSuggestionEngine.getTripSuggestionWithDetails(freshSuggestion.id);
        
        if (!detailedSuggestion) {
            console.log('❌ Failed to get detailed trip suggestion');
            return;
        }
        
        console.log('✅ Detailed trip suggestion retrieved!');
        console.log(`  Event: ${detailedSuggestion.eventName} by ${detailedSuggestion.artist}`);
        console.log(`  Components: ${detailedSuggestion.components?.length || 0}`);
        
        // Test 3: Analyze each component
        if (detailedSuggestion.components && detailedSuggestion.components.length > 0) {
            console.log('\n3️⃣ Analyzing components...');
            
            detailedSuggestion.components.forEach((comp, index) => {
                console.log(`\n  Component ${index + 1}: ${comp.componentType}`);
                console.log(`    Provider: ${comp.provider}`);
                console.log(`    Search Provider: ${comp.searchProvider || 'N/A'}`);
                console.log(`    Price: $${comp.price}`);
                console.log(`    Price Type: ${comp.priceType || 'real'}`);
                
                // Check for booking URL
                const hasBookingUrl = comp.bookingUrl || 
                                    comp.booking_url || 
                                    comp.url ||
                                    (comp.enrichedDetails && (
                                      comp.enrichedDetails.bookingUrl || 
                                      comp.enrichedDetails.booking_url || 
                                      comp.enrichedDetails.url
                                    ));
                
                console.log(`    Has Booking URL: ${hasBookingUrl ? '✅ YES' : '❌ NO'}`);
                
                if (hasBookingUrl) {
                    const bookingUrl = comp.bookingUrl || 
                                     comp.booking_url || 
                                     comp.url ||
                                     (comp.enrichedDetails && (
                                       comp.enrichedDetails.bookingUrl || 
                                       comp.enrichedDetails.booking_url || 
                                       comp.enrichedDetails.url
                                     ));
                    console.log(`    Booking URL: ${bookingUrl}`);
                }
                
                // Check enriched details
                if (comp.enrichedDetails) {
                    console.log(`    Enriched Details Available: ✅ YES`);
                    console.log(`    Data Source: ${comp.enrichedDetails.searchProvider || comp.enrichedDetails.provider || 'Unknown'}`);
                    
                    // Show specific details based on component type
                    if (comp.componentType === 'flight') {
                        console.log(`    Flight Details: ${comp.enrichedDetails.airline || 'N/A'} • ${comp.enrichedDetails.departure || 'N/A'} → ${comp.enrichedDetails.arrival || 'N/A'}`);
                    } else if (comp.componentType === 'hotel') {
                        console.log(`    Hotel Details: ${comp.enrichedDetails.name || comp.enrichedDetails.brand || 'N/A'} • ${comp.enrichedDetails.city || comp.enrichedDetails.location || 'N/A'}`);
                    } else if (comp.componentType === 'car') {
                        console.log(`    Car Details: ${comp.enrichedDetails.model || comp.enrichedDetails.carType || 'N/A'} • ${comp.enrichedDetails.pickupLocation || 'N/A'}`);
                    } else if (comp.componentType === 'ticket') {
                        console.log(`    Ticket Details: ${comp.enrichedDetails.section || 'N/A'} • ${comp.enrichedDetails.ticketType || 'Standard'}`);
                    }
                } else {
                    console.log(`    Enriched Details Available: ❌ NO`);
                }
                
                // Check options
                if (comp.options && comp.options.length > 0) {
                    console.log(`    Options Available: ${comp.options.length}`);
                    comp.options.forEach((option, optIndex) => {
                        console.log(`      ${optIndex + 1}. ${option.provider || option.searchProvider} - $${option.price?.total || option.price}`);
                    });
                } else {
                    console.log(`    Options Available: 0`);
                }
            });
        }
        
        // Test 4: Check database directly
        console.log('\n4️⃣ Checking database directly...');
        const dbComponents = await pool.query(`
            SELECT * FROM trip_components 
            WHERE trip_suggestion_id = $1
            ORDER BY component_type
        `, [freshSuggestion.id]);
        
        console.log(`Found ${dbComponents.rows.length} components in database`);
        
        dbComponents.rows.forEach((comp, index) => {
            console.log(`\n  DB Component ${index + 1}: ${comp.component_type}`);
            console.log(`    Provider: ${comp.provider}`);
            console.log(`    Price: $${comp.price}`);
            
            if (comp.details) {
                try {
                    const details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                    console.log(`    Search Provider: ${details.searchProvider || 'N/A'}`);
                    console.log(`    Price Type: ${details.priceType || 'real'}`);
                    console.log(`    Has Booking URL: ${!!(details.bookingUrl || details.booking_url || details.url) ? '✅ YES' : '❌ NO'}`);
                    
                    if (details.bookingUrl || details.booking_url || details.url) {
                        console.log(`    Booking URL: ${details.bookingUrl || details.booking_url || details.url}`);
                    }
                    
                    // Check provider attribution
                    if (details.providerAttribution) {
                        console.log(`    Provider Attribution:`, details.providerAttribution);
                    }
                    
                } catch (e) {
                    console.log(`    Details: ${comp.details}`);
                }
            }
        });
        
        // Test 5: Verify data quality
        console.log('\n5️⃣ Verifying data quality...');
        
        let hasRealData = false;
        let hasBookingUrls = false;
        let hasEnhancedDetails = false;
        
        if (detailedSuggestion.components) {
            detailedSuggestion.components.forEach(comp => {
                // Check for real data (not mock)
                if (comp.searchProvider && !comp.searchProvider.toLowerCase().includes('mock')) {
                    hasRealData = true;
                }
                
                // Check for booking URLs
                if (comp.bookingUrl || comp.booking_url || comp.url) {
                    hasBookingUrls = true;
                }
                
                // Check for enhanced details
                if (comp.enrichedDetails && Object.keys(comp.enrichedDetails).length > 5) {
                    hasEnhancedDetails = true;
                }
            });
        }
        
        console.log(`  Has Real Data: ${hasRealData ? '✅ YES' : '❌ NO'}`);
        console.log(`  Has Booking URLs: ${hasBookingUrls ? '✅ YES' : '❌ NO'}`);
        console.log(`  Has Enhanced Details: ${hasEnhancedDetails ? '✅ YES' : '❌ NO'}`);
        
        console.log('\n🎉 Fresh trip suggestions test completed!');
        
        if (hasRealData && hasBookingUrls && hasEnhancedDetails) {
            console.log('✅ All quality checks passed! Trip cards should display real data with booking buttons.');
        } else {
            console.log('⚠️ Some quality checks failed. Trip cards may still show fake data or missing booking buttons.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testFreshTripSuggestions().catch(console.error); 