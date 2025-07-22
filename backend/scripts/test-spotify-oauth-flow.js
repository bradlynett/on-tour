// Test Complete Spotify OAuth Flow
const axios = require('axios');
require('dotenv').config();

const baseUrl = 'http://localhost:5001/api';

async function testSpotifyOAuthFlow() {
    console.log('🎵 Testing Complete Spotify OAuth Flow');
    console.log('=====================================');
    
    // Step 1: Login as user
    console.log('\n1. Logging in as user...');
    let token;
    try {
        const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
            email: 'john.doe@example.com',
            password: 'password'
        });
        token = loginResponse.data.data.token;
        console.log('   ✅ Login successful');
    } catch (error) {
        console.log('   ❌ Login failed:', error.response?.data?.message || error.message);
        return;
    }
    
    // Step 2: Get Spotify authorization URL
    console.log('\n2. Getting Spotify authorization URL...');
    try {
        const authResponse = await axios.get(`${baseUrl}/spotify/login`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const authUrl = authResponse.data.url;
        console.log('   ✅ Authorization URL generated');
        console.log('   🔗 URL:', authUrl);
        
        // Extract state from URL
        const urlParams = new URLSearchParams(authUrl.split('?')[1]);
        const state = urlParams.get('state');
        console.log('   📋 State parameter:', state);
        
        // Check if redirect URI is correct
        const redirectUri = urlParams.get('redirect_uri');
        console.log('   🔄 Redirect URI:', redirectUri);
        
        if (redirectUri !== 'http://127.0.0.1:3000/spotify') {
            console.log('   ⚠️  WARNING: Redirect URI mismatch!');
            console.log('      Expected: http://127.0.0.1:3000/spotify');
            console.log('      Actual:   ' + redirectUri);
        }
        
    } catch (error) {
        console.log('   ❌ Failed to get authorization URL:', error.response?.data?.message || error.message);
        return;
    }
    
    console.log('\n🎉 OAuth flow test completed');
    console.log('\n📋 Next steps:');
    console.log('1. Open the authorization URL in a browser');
    console.log('2. Complete Spotify authorization');
    console.log('3. Check if you get redirected to the frontend');
    console.log('4. Check browser console for any errors');
}

testSpotifyOAuthFlow().catch(console.error); 