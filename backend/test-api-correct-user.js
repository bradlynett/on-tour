const axios = require('axios');
const { pool } = require('./config/database');
const { generateToken } = require('./middleware/auth');

// Load environment variables
require('dotenv').config();

async function testAPIWithCorrectUser() {
    console.log('🔍 Testing API with Correct User (john.doe@example.com)');
    console.log('=' .repeat(60));

    try {
        // 1. Get the user who has trip suggestions
        console.log('\n1. Getting user with trip suggestions...');
        
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name 
            FROM users 
            WHERE email = 'john.doe@example.com' 
            LIMIT 1
        `);

        if (userResult.rows.length === 0) {
            console.log('❌ User john.doe@example.com not found');
            return;
        }

        const testUser = userResult.rows[0];
        console.log(`✅ Using user: ${testUser.email} (ID: ${testUser.id})`);

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
                            } else if (provider && price > 0) {
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
            
            // 6. Check why total cost is $0
            console.log(`\n🔍 Total Cost Analysis:`);
            if (suggestions.length > 0) {
                const firstTrip = suggestions[0];
                console.log(`  First trip total cost: $${firstTrip.totalCost || 0}`);
                if (firstTrip.components && firstTrip.components.length > 0) {
                    let componentTotal = 0;
                    firstTrip.components.forEach(comp => {
                        componentTotal += comp.price || 0;
                    });
                    console.log(`  Component prices sum: $${componentTotal.toFixed(2)}`);
                    console.log(`  Service fee: $${firstTrip.serviceFee || 0}`);
                    console.log(`  Expected total: $${(componentTotal + (firstTrip.serviceFee || 0)).toFixed(2)}`);
                }
            }
            
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
testAPIWithCorrectUser(); 