const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001';

async function testDashboardAPI() {
  console.log('🧪 Testing Dashboard API endpoints...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data);

    // Test 2: Try to get interests without auth (should fail)
    console.log('\n2. Testing interests endpoint without auth...');
    try {
      await axios.get(`${API_BASE_URL}/api/users/interests`);
      console.log('❌ Should have failed without auth');
    } catch (error) {
      console.log('✅ Correctly rejected without auth:', error.response?.data?.message || error.message);
    }

    // Test 3: Try to get trips without auth (should fail)
    console.log('\n3. Testing trips endpoint without auth...');
    try {
      await axios.get(`${API_BASE_URL}/api/trips`);
      console.log('❌ Should have failed without auth');
    } catch (error) {
      console.log('✅ Correctly rejected without auth:', error.response?.data?.message || error.message);
    }

    // Test 4: Login with Brad's credentials
    console.log('\n4. Testing login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'brad@lynett.com',
      password: 'TestPassword1'
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log('✅ Login successful, got token');

      // Test 5: Get interests with auth
      console.log('\n5. Testing interests endpoint with auth...');
      const interestsResponse = await axios.get(`${API_BASE_URL}/api/users/interests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Interests response:', {
        success: interestsResponse.data.success,
        interestsCount: interestsResponse.data.data?.interests?.length || 0,
        sampleInterest: interestsResponse.data.data?.interests?.[0]
      });

      // Test 6: Get trips with auth
      console.log('\n6. Testing trips endpoint with auth...');
      const tripsResponse = await axios.get(`${API_BASE_URL}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Trips response:', {
        success: tripsResponse.data.success,
        suggestionsCount: tripsResponse.data.data?.suggestions?.length || 0,
        sampleTrip: tripsResponse.data.data?.suggestions?.[0]
      });

    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testDashboardAPI(); 