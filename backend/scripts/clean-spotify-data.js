require('dotenv').config();
const { pool } = require('../config/database');

async function cleanSpotifyData() {
    try {
        console.log('🧹 Cleaning up Spotify data...\n');
        
        // Show current state
        console.log('📋 Current Spotify data:');
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
        
        console.log('\n🔧 Options:');
        console.log('1. Clear all Spotify data (recommended for fresh start)');
        console.log('2. Clear data for specific user');
        console.log('3. Exit without changes');
        
        // For now, let's just show what would be cleared
        console.log('\n⚠️  To clear all Spotify data, run:');
        console.log('   DELETE FROM spotify_data;');
        console.log('   DELETE FROM spotify_tokens;');
        
        console.log('\n⚠️  To clear data for specific user (e.g., user 24), run:');
        console.log('   DELETE FROM spotify_data WHERE user_id = 24;');
        console.log('   DELETE FROM spotify_tokens WHERE user_id = 24;');
        
        console.log('\n💡 Recommendation:');
        console.log('1. Clear all Spotify data');
        console.log('2. Log out of Spotify in browser: https://accounts.spotify.com/logout');
        console.log('3. Clear browser cookies for Spotify');
        console.log('4. Try the Spotify login again');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

cleanSpotifyData(); 