const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testServerHealth() {
    console.log('🏥 Testing Server Health');
    console.log('========================');

    try {
        // Test 1: Basic health endpoint
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check successful');
        console.log(`   Status: ${healthResponse.data.status}`);
        console.log(`   Database: ${healthResponse.data.database}`);
        console.log(`   Uptime: ${healthResponse.data.uptime}s`);

        // Test 2: Root endpoint
        console.log('\n2. Testing root endpoint...');
        const rootResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Root endpoint working');
        console.log(`   Message: ${rootResponse.data.message}`);
        console.log(`   Status: ${rootResponse.data.status}`);

        // Test 3: Check if database is connected
        console.log('\n3. Checking database connection...');
        if (healthResponse.data.database === 'connected') {
            console.log('✅ Database is connected');
        } else {
            console.log('❌ Database is not connected');
            console.log('   You may need to run the database setup script');
        }

        console.log('\n🎉 Server is running and healthy!');
        console.log('================================');

    } catch (error) {
        console.error('❌ Server health check failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   Server is not running on port 5001');
            console.error('   Please start the server with: npm run dev');
        }
        process.exit(1);
    }
}

// Run the health check
testServerHealth(); 