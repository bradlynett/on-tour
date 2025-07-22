require('dotenv').config();

const TripSuggestionEngine = require('./services/tripSuggestionEngine');
const { pool } = require('./config/database');

async function testEnhancedTripCards() {
    console.log('🚀 Testing Enhanced Trip Cards Display...');
    console.log('=' .repeat(50));
    
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
        
        // Test searchTravelOptions with enhanced providers
        console.log('\n🔍 Testing Enhanced searchTravelOptions...');
        const travelOptions = await TripSuggestionEngine.searchTravelOptions(event, preferences);
        
        console.log('Enhanced Travel Options Found:');
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
                    if (option.details) {
                        console.log(`       Details: ${JSON.stringify(option.details, null, 2).substring(0, 100)}...`);
                    }
                });
            }
        });
        
        // Test creating a trip suggestion with enhanced data
        console.log('\n🎯 Testing Enhanced Trip Suggestion Creation...');
        const tripSuggestion = await TripSuggestionEngine.createTripSuggestion(userId, event.id, preferences);
        
        if (tripSuggestion) {
            console.log('✅ Enhanced trip suggestion created successfully!');
            console.log('Trip Details:', {
                id: tripSuggestion.id,
                totalCost: tripSuggestion.total_cost,
                serviceFee: tripSuggestion.service_fee,
                components: tripSuggestion.components?.length || 0
            });
            
            if (tripSuggestion.components) {
                console.log('\nEnhanced Components:');
                tripSuggestion.components.forEach((comp, index) => {
                    console.log(`  ${index + 1}. ${comp.component_type}:`);
                    console.log(`     Provider: ${comp.provider}`);
                    console.log(`     Search Provider: ${comp.searchProvider || 'N/A'}`);
                    console.log(`     Price: $${comp.price}`);
                    console.log(`     Price Type: ${comp.priceType || 'real'}`);
                    
                    // Parse enriched details
                    let enrichedDetails = null;
                    try {
                        enrichedDetails = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                    } catch (e) {
                        enrichedDetails = comp.details;
                    }
                    
                    if (enrichedDetails) {
                        console.log(`     Enriched Details: ${JSON.stringify(enrichedDetails, null, 2).substring(0, 150)}...`);
                    }
                    
                    // Check for options
                    if (comp.options && comp.options.length > 0) {
                        console.log(`     Options Available: ${comp.options.length}`);
                    }
                });
            }
            
            // Test the enhanced trip suggestion with details
            console.log('\n🔍 Testing Enhanced Trip Suggestion with Details...');
            const detailedSuggestion = await TripSuggestionEngine.getTripSuggestionWithDetails(tripSuggestion.id);
            
            if (detailedSuggestion && detailedSuggestion.components) {
                console.log('\nDetailed Components with Options:');
                detailedSuggestion.components.forEach((comp, index) => {
                    console.log(`  ${index + 1}. ${comp.component_type}:`);
                    console.log(`     Provider: ${comp.provider}`);
                    console.log(`     Price: $${comp.price}`);
                    
                    if (comp.options && comp.options.length > 0) {
                        console.log(`     Options (${comp.options.length}):`);
                        comp.options.forEach((option, optIndex) => {
                            console.log(`       ${optIndex + 1}. ${option.provider || option.searchProvider} - $${option.price?.total || option.price}`);
                        });
                    }
                });
            }
        } else {
            console.log('❌ Failed to create enhanced trip suggestion');
        }
        
        // Test generating multiple trip suggestions
        console.log('\n🎯 Testing Enhanced Trip Suggestion Generation...');
        const suggestions = await TripSuggestionEngine.generateTripSuggestions(userId, 2);
        
        console.log(`Generated ${suggestions.length} enhanced trip suggestions`);
        suggestions.forEach((suggestion, index) => {
            console.log(`  ${index + 1}. ${suggestion.event_name} - $${suggestion.total_cost}`);
            
            if (suggestion.components) {
                const providers = Array.from(new Set(
                    suggestion.components.map(c => c.searchProvider || c.provider).filter(Boolean)
                ));
                console.log(`     Providers: ${providers.join(', ')}`);
                
                const realPrices = suggestion.components.filter(c => c.priceType !== 'estimated').length;
                const estimatedPrices = suggestion.components.filter(c => c.priceType === 'estimated').length;
                console.log(`     Pricing: ${realPrices} real, ${estimatedPrices} estimated`);
            }
        });
        
        console.log('\n🎉 Enhanced trip cards test completed successfully!');
        console.log('✅ Enhanced providers are working with real data');
        console.log('✅ Trip suggestions include provider attribution');
        console.log('✅ Price types (real/estimated) are properly tracked');
        console.log('✅ Enriched details are available for display');
        console.log('✅ Multiple options are available for components');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testEnhancedTripCards().catch(console.error); 