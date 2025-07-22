const SpotifyWebApi = require('spotify-web-api-node');
const { pool } = require('../config/database');

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

async function updateAndTestToken(userId) {
    try {
        console.log(`🔄 Updating and testing token for user ID: ${userId}`);
        
        // Get current tokens from database
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
        console.log('📋 Current token info:');
        console.log(`  - Access token length: ${tokens.access_token.length}`);
        console.log(`  - Access token starts with: ${tokens.access_token.substring(0, 20)}...`);
        console.log(`  - Expires at: ${tokens.expires_at}`);

        // Refresh the token
        console.log('\n🔄 Refreshing token...');
        spotifyApi.setRefreshToken(tokens.refresh_token);
        const refreshResult = await spotifyApi.refreshAccessToken();
        
        const newAccessToken = refreshResult.body.access_token;
        const newExpiresIn = refreshResult.body.expires_in;
        
        console.log('✅ Token refreshed successfully');
        console.log(`  - New token length: ${newAccessToken.length}`);
        console.log(`  - New expires in: ${newExpiresIn} seconds`);

        // Update database with new token
        console.log('\n💾 Updating database with new token...');
        const expiresAt = new Date(Date.now() + newExpiresIn * 1000);
        
        await pool.query(`
            UPDATE spotify_tokens 
            SET access_token = $1, expires_at = $2, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3
        `, [newAccessToken, expiresAt, userId]);
        
        console.log('✅ Database updated');

        // Test the new token
        console.log('\n🧪 Testing new token...');
        spotifyApi.setAccessToken(newAccessToken);

        // Test getMe() with new token
        try {
            console.log('1️⃣ Testing getMe() with new token...');
            const profile = await spotifyApi.getMe();
            console.log('✅ getMe() successful with new token');
            console.log(`   User ID: ${profile.body.id}`);
            console.log(`   Display name: ${profile.body.display_name}`);
            console.log(`   Email: ${profile.body.email}`);
        } catch (error) {
            console.log('❌ getMe() still failed with new token');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test getMyTopArtists() with new token
        try {
            console.log('\n2️⃣ Testing getMyTopArtists() with new token...');
            const artists = await spotifyApi.getMyTopArtists({ limit: 5 });
            console.log('✅ getMyTopArtists() successful with new token');
            console.log(`   Count: ${artists.body.items.length}`);
            console.log(`   First artist: ${artists.body.items[0]?.name}`);
        } catch (error) {
            console.log('❌ getMyTopArtists() still failed with new token');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        await pool.end();
    }
}

// Get user ID from command line argument
const userId = process.argv[2];
if (!userId) {
    console.log('Usage: node update-refreshed-token.js <user_id>');
    process.exit(1);
}

updateAndTestToken(parseInt(userId)); 