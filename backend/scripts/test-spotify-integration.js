// Test Spotify Integration
const axios = require('axios');
require('dotenv').config();

const baseUrl = 'http://localhost:5001/api';

async function testSpotifyIntegration() {
    console.log('🎵 Testing Spotify Integration');
    console.log('=============================');
    
    // Check environment variables
    console.log('\n1. Checking environment variables:');
    console.log('   SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('   SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('   SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI || 'NOT SET');
    
    // Test server health
    console.log('\n2. Testing server health:');
    try {
        const healthResponse = await axios.get(`${baseUrl.replace('/api', '')}/health`);
        console.log('   ✅ Server is healthy:', healthResponse.data.status);
    } catch (error) {
        console.log('   ❌ Server health check failed:', error.message);
        return;
    }
    
    // Login as a test user to get a token
    console.log('\n3. Logging in as test user:');
    try {
        const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
            email: 'john.doe@example.com',
            password: 'password'
        });
        
        const token = loginResponse.data.data.token;
        console.log('   ✅ Login successful, token received');
        
        // Test Spotify login endpoint
        console.log('\n4. Testing Spotify login endpoint:');
        try {
            const spotifyLoginResponse = await axios.get(`${baseUrl}/spotify/login`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('   ✅ Spotify login endpoint working');
            console.log('   📋 Authorization URL generated');
            console.log('   🔗 URL preview:', spotifyLoginResponse.data.url.substring(0, 100) + '...');
            
        } catch (error) {
            console.log('   ❌ Spotify login endpoint failed:');
            console.log('      Status:', error.response?.status);
            console.log('      Message:', error.response?.data?.message || error.message);
        }
        
    } catch (error) {
        console.log('   ❌ Login failed:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Spotify integration test completed');
}

testSpotifyIntegration().catch(console.error); 