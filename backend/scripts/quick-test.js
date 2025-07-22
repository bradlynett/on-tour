const axios = require('axios');

async function testEndpoints() {
    const baseUrl = 'http://localhost:5001';
    
    console.log('🔍 Testing available endpoints...\n');
    
    const endpoints = [
        '/',
        '/health',
        '/api/health',
        '/api/travel/health',
        '/api/admin/health'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${baseUrl}${endpoint}`);
            console.log(`✅ ${endpoint} - Status: ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
        } catch (error) {
            console.log(`❌ ${endpoint} - ${error.response?.status || error.code}: ${error.message}`);
        }
        console.log('');
    }
}

testEndpoints().catch(console.error); 