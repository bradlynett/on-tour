require('dotenv').config();
const { pool } = require('../config/database');

async function debugSpotifyUserMismatch() {
    try {
        console.log('🔍 Debugging Spotify User Mismatch...\n');
        
        // Get all Spotify data with user details
        const result = await pool.query(`
            SELECT 
                sd.user_id,
                u.email,
                u.first_name,
                u.last_name,
                sd.music_data,
                sd.created_at,
                sd.updated_at
            FROM spotify_data sd
            JOIN users u ON sd.user_id = u.id
            ORDER BY sd.user_id
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ No Spotify data found');
            return;
        }
        
        result.rows.forEach(row => {
            console.log(`\n👤 Database User: ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.user_id}`);
            console.log(`📅 Data created: ${row.created_at}`);
            console.log(`📅 Data updated: ${row.updated_at}`);
            
            try {
                const musicData = row.music_data;
                if (musicData.userProfile) {
                    console.log(`🎵 Spotify Profile: ${musicData.userProfile.display_name} (${musicData.userProfile.email})`);
                    console.log(`🎵 Spotify ID: ${musicData.userProfile.id}`);
                } else {
                    console.log('❌ No user profile in music data');
                }
                
                console.log(`📊 Data summary:`);
                console.log(`   - Top artists: ${musicData.topArtists?.length || 0}`);
                console.log(`   - Top tracks: ${musicData.topTracks?.length || 0}`);
                console.log(`   - Genres: ${musicData.genres?.length || 0}`);
                console.log(`   - Playlists: ${musicData.playlists?.length || 0}`);
                
                // Check for potential mismatch
                const dbEmail = row.email.toLowerCase();
                const spotifyEmail = musicData.userProfile?.email?.toLowerCase();
                
                if (spotifyEmail && dbEmail !== spotifyEmail) {
                    console.log(`⚠️  EMAIL MISMATCH DETECTED!`);
                    console.log(`   Database: ${dbEmail}`);
                    console.log(`   Spotify: ${spotifyEmail}`);
                } else if (spotifyEmail) {
                    console.log(`✅ Email match: ${dbEmail}`);
                } else {
                    console.log(`❓ Spotify email not available`);
                }
                
            } catch (error) {
                console.log(`❌ Error parsing music data: ${error.message}`);
            }
        });
        
        // Check if there are multiple users with the same Spotify account
        console.log('\n🔍 Checking for duplicate Spotify accounts...');
        const spotifyAccounts = new Map();
        
        result.rows.forEach(row => {
            try {
                const musicData = row.music_data;
                if (musicData.userProfile?.id) {
                    const spotifyId = musicData.userProfile.id;
                    if (spotifyAccounts.has(spotifyId)) {
                        console.log(`⚠️  DUPLICATE SPOTIFY ACCOUNT: ${spotifyId}`);
                        console.log(`   User 1: ${spotifyAccounts.get(spotifyId)}`);
                        console.log(`   User 2: ${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.user_id}`);
                    } else {
                        spotifyAccounts.set(spotifyId, `${row.first_name} ${row.last_name} (${row.email}) - ID: ${row.user_id}`);
                    }
                }
            } catch (error) {
                // Skip parsing errors
            }
        });
        
        if (spotifyAccounts.size === 0) {
            console.log('   No Spotify account IDs found in data');
        } else {
            console.log(`   Found ${spotifyAccounts.size} unique Spotify accounts`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugSpotifyUserMismatch(); 