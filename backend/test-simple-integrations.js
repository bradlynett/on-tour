require('dotenv').config();

const SerpAPIProvider = require('./services/providers/serpapiProvider');
const SeatGeekProvider = require('./services/providers/seatgeekProvider');

async function testSimpleIntegrations() {
    console.log('🚀 Simple Integration Test...');
    console.log('=' .repeat(40));
    
    // Test 1: Environment Variables
    console.log('\n1️⃣ Environment Variables:');
    console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? '✅ Found' : '❌ Not found');
    console.log('SEATGEEK_CLIENT_ID:', process.env.SEATGEEK_CLIENT_ID ? '✅ Found' : '❌ Not found');
    console.log('SEATGEEK_CLIENT_SECRET:', process.env.SEATGEEK_CLIENT_SECRET ? '✅ Found' : '❌ Not found');
    
    // Test 2: SerpAPI Provider
    console.log('\n2️⃣ SerpAPI Provider:');
    const serpapi = new SerpAPIProvider();
    const serpapiAvailable = await serpapi.isAvailable();
    console.log('Available:', serpapiAvailable ? '✅ Yes' : '❌ No');
    
    if (serpapiAvailable) {
        try {
            const health = await serpapi.healthCheck();
            console.log('Health:', health.status);
        } catch (error) {
            console.log('Health check failed:', error.message);
        }
    }
    
    // Test 3: SeatGeek Provider
    console.log('\n3️⃣ SeatGeek Provider:');
    const seatgeek = new SeatGeekProvider();
    const seatgeekAvailable = await seatgeek.isAvailable();
    console.log('Available:', seatgeekAvailable ? '✅ Yes' : '❌ No');
    
    if (seatgeekAvailable) {
        try {
            const health = await seatgeek.healthCheck();
            console.log('Health:', health.status);
            
            // Test basic event search
            console.log('Testing event search...');
            const events = await seatgeek.searchEvents({ query: 'concert', per_page: 2 });
            console.log(`Found ${events.length} events`);
            
            if (events.length > 0) {
                console.log('Sample event:', events[0].title);
            }
        } catch (error) {
            console.log('Health check failed:', error.message);
        }
    }
    
    // Test 4: Summary
    console.log('\n4️⃣ Summary:');
    console.log('SerpAPI:', serpapiAvailable ? '✅ Ready' : '❌ Not ready');
    console.log('SeatGeek:', seatgeekAvailable ? '✅ Ready' : '❌ Not ready');
    
    if (serpapiAvailable && seatgeekAvailable) {
        console.log('\n🎉 Both integrations are ready!');
        console.log('Next step: Integrate into trip suggestion engine');
    } else {
        console.log('\n⚠️  Some integrations need attention');
    }
}

testSimpleIntegrations().catch(console.error); 