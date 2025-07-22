require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');

console.log('🔍 Spotify Configuration Check');
console.log('=============================\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
console.log(`   SPOTIFY_CLIENT_ID: ${process.env.SPOTIFY_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   SPOTIFY_CLIENT_SECRET: ${process.env.SPOTIFY_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   SPOTIFY_REDIRECT_URI: ${process.env.SPOTIFY_REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);

if (process.env.SPOTIFY_CLIENT_ID) {
    console.log(`   Client ID: ${process.env.SPOTIFY_CLIENT_ID}`);
}
if (process.env.SPOTIFY_REDIRECT_URI) {
    console.log(`   Redirect URI: ${process.env.SPOTIFY_REDIRECT_URI}`);
}

console.log('\n2️⃣ Spotify App Configuration Issues:');
console.log('   ❌ The error message indicates: "Check settings on developer.spotify.com/dashboard, the user may not be registered."');
console.log('   This means one of the following issues:');

console.log('\n   🔧 Possible Solutions:');
console.log('   a) Add the user as a test user in Spotify Developer Dashboard:');
console.log('      - Go to https://developer.spotify.com/dashboard');
console.log('      - Select your app');
console.log('      - Go to "Users and Access" tab');
console.log('      - Add the user\'s email address as a test user');
console.log('      - The user must accept the invitation to become a test user');

console.log('\n   b) Check app settings:');
console.log('      - Ensure the app is in "Development" mode (not "Production")');
console.log('      - Verify the redirect URI matches exactly:');
console.log(`         Expected: ${process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/spotify'}`);
console.log('      - Check that all required scopes are enabled');

console.log('\n   c) User registration:');
console.log('      - The user must have a Spotify account');
console.log('      - The user must be added as a test user to your app');
console.log('      - The user must accept the test user invitation');

console.log('\n3️⃣ Required Scopes:');
const requiredScopes = [
    'user-top-read',
    'user-read-recently-played', 
    'user-read-private',
    'playlist-read-private',
    'user-follow-read'
];
console.log('   Make sure these scopes are enabled in your Spotify app:');
requiredScopes.forEach(scope => {
    console.log(`      - ${scope}`);
});

console.log('\n4️⃣ Next Steps:');
console.log('   1. Go to https://developer.spotify.com/dashboard');
console.log('   2. Select your app');
console.log('   3. Go to "Users and Access" tab');
console.log('   4. Add the user\'s email as a test user');
console.log('   5. Have the user check their email and accept the invitation');
console.log('   6. Try the Spotify login flow again');

console.log('\n5️⃣ Test the configuration:');
console.log('   After fixing the above issues, run:');
console.log('   node scripts/test-spotify-token.js <user_id>');

console.log('\n📝 Note: If you\'re using a production Spotify app, you need to submit it for review');
console.log('   and have it approved by Spotify before it can be used by non-test users.'); 