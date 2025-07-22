const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test data
const testUser = {
    email: `test-booking-${Date.now()}@example.com`,
    password: 'TestPassword123',
    phone: '555-123-4567'
};

async function testSimple() {
    console.log('🚀 Starting Simple Booking System Test\n');

    try {
        console.log('🔐 Testing User Registration...');
        console.log('User email:', testUser.email);

        // Register user
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
        console.log('✅ User registration successful');
        console.log('Response:', JSON.stringify(registerResponse.data, null, 2));

        console.log('\n🔐 Testing User Login...');
        
        // Login user
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        console.log('✅ User login successful');
        console.log('Response:', JSON.stringify(loginResponse.data, null, 2));

        const authToken = loginResponse.data.data.token;
        const testUserId = loginResponse.data.data.user.id;
        
        console.log(`\n📊 User Details:`);
        console.log(`   User ID: ${testUserId}`);
        console.log(`   Token: ${authToken.substring(0, 20)}...`);

        console.log('\n🎉 Simple Test Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testSimple().catch(console.error); 