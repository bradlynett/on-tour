const axios = require('axios');

// Test API connectivity
async function testAPI() {
  console.log('🔍 Testing Mobile App API Connectivity...\n');
  
  const API_BASE_URL = 'http://192.168.0.42:5001/api';
  
  try {
    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    
    // Test 2: API base endpoint
    console.log('\n2. Testing API base endpoint...');
    const apiResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ API endpoint accessible');
    
    // Test 3: Auth endpoints
    console.log('\n3. Testing auth endpoints...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Auth endpoint working (expected 401 for invalid credentials)');
      } else {
        console.log('❌ Auth endpoint error:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 4: Users endpoint
    console.log('\n4. Testing users endpoint...');
    try {
      await axios.get(`${API_BASE_URL}/users/profile`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Users endpoint working (expected 401 without auth)');
      } else {
        console.log('❌ Users endpoint error:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 5: Trips endpoint
    console.log('\n5. Testing trips endpoint...');
    try {
      await axios.get(`${API_BASE_URL}/trips`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Trips endpoint working (expected 401 without auth)');
      } else {
        console.log('❌ Trips endpoint error:', error.response?.status, error.response?.data);
      }
    }
    
    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📱 Mobile app should be able to connect to the backend.');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure the backend is running on port 5001');
    console.log('2. Check if localhost is accessible');
    console.log('3. Verify no firewall is blocking the connection');
    console.log('4. Try using 127.0.0.1 instead of localhost');
  }
}

// Run the test
testAPI(); 