const SpotifyWebApi = require('spotify-web-api-node');
const { pool } = require('../config/database');

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

async function debugSpotifyError(userId) {
    try {
        console.log(`🔍 Debugging Spotify error for user ID: ${userId}`);
        
        // Get tokens from database
        const result = await pool.query(`
            SELECT access_token, refresh_token, expires_at
            FROM spotify_tokens
            WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            console.log('❌ No tokens found for user');
            return;
        }

        const tokens = result.rows[0];
        console.log('📋 Token info:');
        console.log(`  - Access token length: ${tokens.access_token.length}`);
        console.log(`  - Access token starts with: ${tokens.access_token.substring(0, 20)}...`);
        console.log(`  - Expires at: ${tokens.expires_at}`);
        console.log(`  - Is expired: ${new Date() > new Date(tokens.expires_at)}`);

        // Set the token
        spotifyApi.setAccessToken(tokens.access_token);

        // Test with detailed error logging
        console.log('\n🧪 Testing with detailed error logging...');

        try {
            console.log('1️⃣ Testing getMe()...');
            const profile = await spotifyApi.getMe();
            console.log('✅ getMe() successful');
            console.log(`   User ID: ${profile.body.id}`);
            console.log(`   Display name: ${profile.body.display_name}`);
            console.log(`   Email: ${profile.body.email}`);
        } catch (error) {
            console.log('❌ getMe() failed');
            console.log(`   Error message: ${error.message}`);
            console.log(`   Status code: ${error.statusCode}`);
            console.log(`   Error body:`, JSON.stringify(error.body, null, 2));
            console.log(`   Error headers:`, JSON.stringify(error.headers, null, 2));
            console.log(`   Full error object:`, JSON.stringify(error, null, 2));
        }

        // Test with a different approach - try to get the raw response
        console.log('\n2️⃣ Testing with raw HTTP request...');
        try {
            const axios = require('axios');
            
            const response = await axios.get('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Raw HTTP request successful');
            console.log(`   Status: ${response.status}`);
            console.log(`   Data:`, JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('❌ Raw HTTP request failed');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Status text: ${error.response?.statusText}`);
            console.log(`   Data:`, JSON.stringify(error.response?.data, null, 2));
            console.log(`   Headers:`, JSON.stringify(error.response?.headers, null, 2));
        }

        // Test with a public endpoint that doesn't require authentication
        console.log('\n3️⃣ Testing public endpoint...');
        try {
            const axios = require('axios');
            
            const response = await axios.get('https://api.spotify.com/v1/browse/new-releases?limit=1');
            
            console.log('✅ Public endpoint successful');
            console.log(`   Status: ${response.status}`);
            console.log(`   Has data: ${!!response.data}`);
        } catch (error) {
            console.log('❌ Public endpoint failed');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Data:`, JSON.stringify(error.response?.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await pool.end();
    }
}

// Get user ID from command line argument
const userId = process.argv[2];
if (!userId) {
    console.log('Usage: node debug-spotify-error.js <user_id>');
    process.exit(1);
}

debugSpotifyError(parseInt(userId)); 