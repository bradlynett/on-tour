const axios = require('axios');
const { pool } = require('./config/database');
const { generateToken } = require('./middleware/auth');

// Load environment variables
require('dotenv').config();

async function testAPIWithAuth() {
    console.log('🔍 Testing API with Authentication');
    console.log('=' .repeat(60));

    try {
        // 1. Create or get a test user
        console.log('\n1. Setting up test user...');
        
        let testUser;
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name 
            FROM users 
            WHERE email = 'test@example.com' 
            LIMIT 1
        `);

        if (userResult.rows.length > 0) {
            testUser = userResult.rows[0];
            console.log(`✅ Using existing test user: ${testUser.email} (ID: ${testUser.id})`);
        } else {
            // Create a test user
            const insertResult = await pool.query(`
                INSERT INTO users (email, first_name, last_name, password_hash, created_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                RETURNING id, email, first_name, last_name
            `, ['test@example.com', 'Test', 'User', 'hashed_password']);

            testUser = insertResult.rows[0];
            console.log(`✅ Created test user: ${testUser.email} (ID: ${testUser.id})`);
        }

        // 2. Generate a valid JWT token
        console.log('\n2. Generating JWT token...');
        const token = generateToken(testUser.id);
        console.log(`✅ Generated token for user ${testUser.id}`);

        // 3. Test the trips API endpoint with authentication
        console.log('\n3. Testing /api/trips endpoint with auth...');
        
        const response = await axios.get('http://localhost:5001/api/trips', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log(`✅ API Response Status: ${response.status}`);
        
        if (response.data && response.data.success) {
            const data = response.data.data;
            const suggestions = data.suggestions || [];
            
            console.log(`\n📊 API Response Summary:`);
            console.log(`  Success: ${response.data.success}`);
            console.log(`  Total suggestions: ${suggestions.length}`);
            
            if (suggestions.length > 0) {
                console.log(`\n📋 Trip Suggestions Details:`);
                
                for (let i = 0; i < Math.min(suggestions.length, 5); i++) {
                    const trip = suggestions[i];
                    console.log(`\n  Trip ${i + 1}:`);
                    console.log(`    ID: ${trip.id}`);
                    console.log(`    Event: ${trip.eventName}`);
                    console.log(`    Artist: ${trip.artist}`);
                    console.log(`    Total Cost: $${trip.totalCost || 0}`);
                    console.log(`    Service Fee: $${trip.serviceFee || 0}`);
                    console.log(`    Components: ${trip.components?.length || 0}`);
                    
                    if (trip.components && trip.components.length > 0) {
                        console.log(`    Component Details:`);
                        trip.components.forEach((comp, idx) => {
                            console.log(`      ${idx + 1}. ${comp.componentType}:`);
                            console.log(`         Provider: ${comp.provider || comp.searchProvider}`);
                            console.log(`         Price: $${comp.price || 0}`);
                            console.log(`         Booking URL: ${comp.bookingUrl || comp.booking_reference || 'N/A'}`);
                            console.log(`         Price Type: ${comp.priceType || 'unknown'}`);
                        });
                    } else {
                        console.log(`    ⚠️ No components available`);
                    }
                }
            } else {
                console.log(`\n⚠️ No trip suggestions returned`);
            }
            
            // 4. Check for mock data indicators
            console.log(`\n🔍 Mock Data Analysis:`);
            let mockDataFound = false;
            let realDataFound = false;
            let totalRealCost = 0;
            let tripsWithRealData = 0;
            
            if (suggestions.length > 0) {
                for (const trip of suggestions) {
                    let tripHasRealData = false;
                    
                    if (trip.components) {
                        for (const comp of trip.components) {
                            const provider = comp.provider || comp.searchProvider;
                            const price = comp.price || 0;
                            const bookingUrl = comp.bookingUrl || comp.booking_reference;
                            
                            if (provider === 'skyscanner' || provider === 'bookingcom' || provider === 'agoda') {
                                console.log(`  ❌ Mock provider found: ${provider} in trip ${trip.id}`);
                                mockDataFound = true;
                            } else if (provider && price > 0 && bookingUrl) {
                                console.log(`  ✅ Real data: ${provider} - $${price} - ${bookingUrl ? 'Has URL' : 'No URL'}`);
                                tripHasRealData = true;
                                realDataFound = true;
                            }
                        }
                    }
                    
                    if (tripHasRealData) {
                        tripsWithRealData++;
                        totalRealCost += trip.totalCost || 0;
                    }
                }
            }
            
            if (!mockDataFound) {
                console.log(`  ✅ No mock providers detected`);
            }
            
            if (realDataFound) {
                console.log(`  ✅ Real data found in ${tripsWithRealData} trips`);
                console.log(`  💰 Total real cost: $${totalRealCost.toFixed(2)}`);
            } else {
                console.log(`  ⚠️ No real data found`);
            }
            
            // 5. Summary for frontend
            console.log(`\n🎯 Frontend Status:`);
            console.log(`  Trips to display: ${suggestions.length}`);
            console.log(`  Trips with real data: ${tripsWithRealData}`);
            console.log(`  Trips with mock data: ${mockDataFound ? 'YES - NEEDS FIX' : 'NO'}`);
            console.log(`  Average cost per trip: $${suggestions.length > 0 ? (totalRealCost / suggestions.length).toFixed(2) : '0.00'}`);
            
        } else {
            console.log(`❌ API response format unexpected:`);
            console.log(JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error(`❌ API test failed: ${error.message}`);
        
        if (error.response) {
            console.log(`  Status: ${error.response.status}`);
            console.log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    } finally {
        await pool.end();
    }
}

// Run the test
testAPIWithAuth(); 