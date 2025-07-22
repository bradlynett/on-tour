const SpotifyWebApi = require('spotify-web-api-node');
const { pool } = require('../config/database');

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

async function testSpotifyToken(userId) {
    try {
        console.log(`🔍 Testing Spotify token for user ID: ${userId}`);
        
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

        // Test token with different API calls
        spotifyApi.setAccessToken(tokens.access_token);

        console.log('\n🧪 Testing API calls...');

        // Test 1: Get user profile (basic call)
        try {
            console.log('1️⃣ Testing getMe()...');
            const profile = await spotifyApi.getMe();
            console.log('✅ getMe() successful');
            console.log(`   User ID: ${profile.body.id}`);
            console.log(`   Display name: ${profile.body.display_name}`);
            console.log(`   Email: ${profile.body.email}`);
        } catch (error) {
            console.log('❌ getMe() failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test 2: Get top artists
        try {
            console.log('\n2️⃣ Testing getMyTopArtists()...');
            const artists = await spotifyApi.getMyTopArtists({ limit: 5 });
            console.log('✅ getMyTopArtists() successful');
            console.log(`   Count: ${artists.body.items.length}`);
            console.log(`   First artist: ${artists.body.items[0]?.name}`);
        } catch (error) {
            console.log('❌ getMyTopArtists() failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test 3: Get top tracks
        try {
            console.log('\n3️⃣ Testing getMyTopTracks()...');
            const tracks = await spotifyApi.getMyTopTracks({ limit: 5 });
            console.log('✅ getMyTopTracks() successful');
            console.log(`   Count: ${tracks.body.items.length}`);
            console.log(`   First track: ${tracks.body.items[0]?.name}`);
        } catch (error) {
            console.log('❌ getMyTopTracks() failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test 4: Get recently played
        try {
            console.log('\n4️⃣ Testing getMyRecentlyPlayedTracks()...');
            const recent = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 5 });
            console.log('✅ getMyRecentlyPlayedTracks() successful');
            console.log(`   Count: ${recent.body.items.length}`);
            console.log(`   First track: ${recent.body.items[0]?.track?.name}`);
        } catch (error) {
            console.log('❌ getMyRecentlyPlayedTracks() failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test 5: Get playlists
        try {
            console.log('\n5️⃣ Testing getUserPlaylists()...');
            const playlists = await spotifyApi.getUserPlaylists({ limit: 5 });
            console.log('✅ getUserPlaylists() successful');
            console.log(`   Count: ${playlists.body.items.length}`);
            console.log(`   First playlist: ${playlists.body.items[0]?.name}`);
        } catch (error) {
            console.log('❌ getUserPlaylists() failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test 6: Get followed artists
        try {
            console.log('\n6️⃣ Testing getFollowedArtists()...');
            const followed = await spotifyApi.getFollowedArtists({ limit: 5 });
            console.log('✅ getFollowedArtists() successful');
            console.log(`   Count: ${followed.body.artists.items.length}`);
            console.log(`   First artist: ${followed.body.artists.items[0]?.name}`);
        } catch (error) {
            console.log('❌ getFollowedArtists() failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

        // Test 7: Try to refresh token
        try {
            console.log('\n7️⃣ Testing token refresh...');
            spotifyApi.setRefreshToken(tokens.refresh_token);
            const refreshResult = await spotifyApi.refreshAccessToken();
            console.log('✅ Token refresh successful');
            console.log(`   New token length: ${refreshResult.body.access_token.length}`);
            console.log(`   New expires in: ${refreshResult.body.expires_in}`);
        } catch (error) {
            console.log('❌ Token refresh failed');
            console.log(`   Error: ${error.message}`);
            console.log(`   Status: ${error.statusCode}`);
            console.log(`   Body:`, error.body);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Get user ID from command line argument
const userId = process.argv[2];
if (!userId) {
    console.log('Usage: node test-spotify-token.js <user_id>');
    process.exit(1);
}

testSpotifyToken(parseInt(userId)); 