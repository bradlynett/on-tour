require('dotenv').config();
const { pool } = require('../config/database');

async function fixSpotifyMismatch() {
    try {
        console.log('🔧 Fixing Spotify User Mismatch...\n');
        
        // Show current problematic data
        console.log('📋 Current Spotify Data (with mismatches):');
        const currentData = await pool.query(`
            SELECT 
                sd.user_id,
                u.email,
                u.first_name,
                u.last_name,
                sd.music_data->>'userProfile' as profile
            FROM spotify_data sd
            JOIN users u ON sd.user_id = u.id
            ORDER BY sd.user_id
        `);
        
        currentData.rows.forEach(row => {
            try {
                const profile = JSON.parse(row.profile);
                console.log(`   User ${row.user_id} (${row.email}): ${profile.display_name} (${profile.id})`);
            } catch (e) {
                console.log(`   User ${row.user_id} (${row.email}): Could not parse profile`);
            }
        });
        
        console.log('\n⚠️  Issues Found:');
        console.log('   - Multiple users sharing same Spotify accounts');
        console.log('   - Spotify accounts don\'t match user names');
        console.log('   - Data being saved to wrong users');
        
        console.log('\n🧹 Clearing all Spotify data to fix this...');
        
        // Clear all Spotify data
        const deleteDataResult = await pool.query('DELETE FROM spotify_data');
        const deleteTokensResult = await pool.query('DELETE FROM spotify_tokens');
        
        console.log(`✅ Cleared ${deleteDataResult.rowCount} Spotify data records`);
        console.log(`✅ Cleared ${deleteTokensResult.rowCount} Spotify token records`);
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Log out of Spotify: https://accounts.spotify.com/logout');
        console.log('2. Clear browser cookies for Spotify');
        console.log('3. Try the Spotify login again in your app');
        console.log('4. Make sure to log in with the correct Spotify account');
        
        console.log('\n💡 Tips:');
        console.log('   - The app will now force a fresh Spotify login');
        console.log('   - Each user should use their own Spotify account');
        console.log('   - Check the Spotify profile name matches the user');
        
        // Verify cleanup
        console.log('\n🔍 Verifying cleanup...');
        const remainingData = await pool.query('SELECT COUNT(*) as count FROM spotify_data');
        const remainingTokens = await pool.query('SELECT COUNT(*) as count FROM spotify_tokens');
        
        console.log(`   Remaining data records: ${remainingData.rows[0].count}`);
        console.log(`   Remaining token records: ${remainingTokens.rows[0].count}`);
        
        if (remainingData.rows[0].count === 0 && remainingTokens.rows[0].count === 0) {
            console.log('✅ Cleanup successful! Ready for fresh Spotify integration.');
        } else {
            console.log('⚠️  Some data remains. You may need to manually clear it.');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await pool.end();
    }
}

fixSpotifyMismatch(); 