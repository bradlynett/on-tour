require('dotenv').config();

const { pool } = require('./config/database');
const TripSuggestionEngine = require('./services/tripSuggestionEngine');

async function testDatabaseTripComponents() {
    console.log('🔍 Testing Database Trip Components...');
    console.log('=' .repeat(50));
    
    try {
        // Test 1: Check trip_components table structure
        console.log('\n1️⃣ Checking trip_components table structure...');
        const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'trip_components'
            ORDER BY ordinal_position;
        `);
        
        console.log('Table structure:');
        tableStructure.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Test 2: Check recent trip components
        console.log('\n2️⃣ Checking recent trip components...');
        const recentComponents = await pool.query(`
            SELECT tc.*, ts.user_id, e.name as event_name, e.artist
            FROM trip_components tc
            JOIN trip_suggestions ts ON tc.trip_suggestion_id = ts.id
            JOIN events e ON ts.event_id = e.id
            ORDER BY tc.created_at DESC
            LIMIT 10
        `);
        
        console.log(`Found ${recentComponents.rows.length} recent trip components`);
        
        recentComponents.rows.forEach((comp, index) => {
            console.log(`\n  Component ${index + 1}:`);
            console.log(`    ID: ${comp.id}`);
            console.log(`    Type: ${comp.component_type}`);
            console.log(`    Provider: ${comp.provider}`);
            console.log(`    Price: $${comp.price}`);
            console.log(`    Event: ${comp.event_name} by ${comp.artist}`);
            console.log(`    User ID: ${comp.user_id}`);
            console.log(`    Created: ${comp.created_at}`);
            
            // Parse and display details
            if (comp.details) {
                try {
                    const details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                    console.log(`    Details: ${JSON.stringify(details, null, 2).substring(0, 200)}...`);
                    
                    // Check for enhanced fields
                    if (details.searchProvider) {
                        console.log(`    Search Provider: ${details.searchProvider}`);
                    }
                    if (details.priceType) {
                        console.log(`    Price Type: ${details.priceType}`);
                    }
                    if (details.bookingUrl) {
                        console.log(`    Booking URL: ${details.bookingUrl}`);
                    }
                } catch (e) {
                    console.log(`    Details: ${comp.details}`);
                }
            }
        });
        
        // Test 3: Check if there are any trip suggestions
        console.log('\n3️⃣ Checking trip suggestions...');
        const tripSuggestions = await pool.query(`
            SELECT ts.*, e.name as event_name, e.artist
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            ORDER BY ts.created_at DESC
            LIMIT 5
        `);
        
        console.log(`Found ${tripSuggestions.rows.length} trip suggestions`);
        
        tripSuggestions.rows.forEach((suggestion, index) => {
            console.log(`\n  Suggestion ${index + 1}:`);
            console.log(`    ID: ${suggestion.id}`);
            console.log(`    Event: ${suggestion.event_name} by ${suggestion.artist}`);
            console.log(`    Total Cost: $${suggestion.total_cost}`);
            console.log(`    Service Fee: $${suggestion.service_fee}`);
            console.log(`    Status: ${suggestion.status}`);
            console.log(`    Created: ${suggestion.created_at}`);
            
            // Check components for this suggestion
            pool.query(`
                SELECT COUNT(*) as count FROM trip_components 
                WHERE trip_suggestion_id = $1
            `, [suggestion.id]).then(result => {
                console.log(`    Components: ${result.rows[0].count}`);
            });
        });
        
        // Test 4: Create a fresh trip suggestion with enhanced data
        console.log('\n4️⃣ Creating fresh trip suggestion with enhanced data...');
        
        // Get a user and event
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        const eventResult = await pool.query(`
            SELECT id, name, artist, venue_name, venue_city, venue_state, event_date
            FROM events 
            WHERE event_date > CURRENT_DATE
            ORDER BY event_date ASC
            LIMIT 1
        `);
        
        if (userResult.rows.length === 0 || eventResult.rows.length === 0) {
            console.log('❌ No users or events found');
            return;
        }
        
        const userId = userResult.rows[0].id;
        const event = eventResult.rows[0];
        
        console.log(`Using user ${userId} and event: ${event.name}`);
        
        // Get user preferences
        const prefResult = await pool.query(`
            SELECT primary_airport, preferred_airlines, flight_class
            FROM travel_preferences 
            WHERE user_id = $1
        `, [userId]);
        
        const preferences = prefResult.rows[0] || { primary_airport: 'DEN' };
        
        // Create fresh trip suggestion
        const freshSuggestion = await TripSuggestionEngine.createTripSuggestion(userId, event.id, preferences);
        
        if (freshSuggestion) {
            console.log('✅ Fresh trip suggestion created!');
            console.log(`  ID: ${freshSuggestion.id}`);
            console.log(`  Total Cost: $${freshSuggestion.total_cost}`);
            console.log(`  Components: ${freshSuggestion.components?.length || 0}`);
            
            // Check the components in database
            const freshComponents = await pool.query(`
                SELECT * FROM trip_components 
                WHERE trip_suggestion_id = $1
                ORDER BY component_type
            `, [freshSuggestion.id]);
            
            console.log('\nFresh components in database:');
            freshComponents.rows.forEach((comp, index) => {
                console.log(`  ${index + 1}. ${comp.component_type}:`);
                console.log(`     Provider: ${comp.provider}`);
                console.log(`     Price: $${comp.price}`);
                
                if (comp.details) {
                    try {
                        const details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                        console.log(`     Search Provider: ${details.searchProvider || 'N/A'}`);
                        console.log(`     Price Type: ${details.priceType || 'real'}`);
                        console.log(`     Booking URL: ${details.bookingUrl ? 'Yes' : 'No'}`);
                        console.log(`     Details: ${JSON.stringify(details, null, 2).substring(0, 150)}...`);
                    } catch (e) {
                        console.log(`     Details: ${comp.details}`);
                    }
                }
            });
        }
        
        // Test 5: Check why booking buttons might not show
        console.log('\n5️⃣ Checking booking button conditions...');
        
        const sampleComponent = recentComponents.rows[0];
        if (sampleComponent && sampleComponent.details) {
            try {
                const details = typeof sampleComponent.details === 'string' ? JSON.parse(sampleComponent.details) : sampleComponent.details;
                console.log('Sample component details:');
                console.log(`  Has bookingUrl: ${!!details.bookingUrl}`);
                console.log(`  Has booking_url: ${!!details.booking_url}`);
                console.log(`  Has url: ${!!details.url}`);
                console.log(`  Available booking fields:`, Object.keys(details).filter(key => key.toLowerCase().includes('url') || key.toLowerCase().includes('booking')));
            } catch (e) {
                console.log('Could not parse component details');
            }
        }
        
        console.log('\n🎉 Database trip components test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testDatabaseTripComponents().catch(console.error); 