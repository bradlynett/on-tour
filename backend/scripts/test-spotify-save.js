require('dotenv').config();
const { pool } = require('../config/database');
const spotifyService = require('../services/spotifyService');

async function testSpotifySave(userId) {
    try {
        console.log(`🧪 Testing Spotify data save for user ID: ${userId}`);
        
        // Test 1: Check if user exists
        console.log('\n1️⃣ Checking if user exists...');
        const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        console.log('✅ User found:', userResult.rows[0].email);
        
        // Test 2: Check if spotify_data table exists
        console.log('\n2️⃣ Checking spotify_data table...');
        const tableResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'spotify_data'
            );
        `);
        console.log('✅ Table exists:', tableResult.rows[0].exists);
        
        // Test 3: Check table structure
        console.log('\n3️⃣ Checking table structure...');
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'spotify_data'
            ORDER BY ordinal_position;
        `);
        console.log('📋 Table columns:');
        columnsResult.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Test 4: Check if user has existing Spotify data
        console.log('\n4️⃣ Checking existing Spotify data...');
        const existingResult = await pool.query('SELECT id, created_at, updated_at FROM spotify_data WHERE user_id = $1', [userId]);
        if (existingResult.rows.length > 0) {
            console.log('✅ Existing data found:');
            console.log(`   - ID: ${existingResult.rows[0].id}`);
            console.log(`   - Created: ${existingResult.rows[0].created_at}`);
            console.log(`   - Updated: ${existingResult.rows[0].updated_at}`);
        } else {
            console.log('📝 No existing data found');
        }
        
        // Test 5: Test saving sample data
        console.log('\n5️⃣ Testing save with sample data...');
        const sampleData = {
            userProfile: {
                id: 'test_user_id',
                display_name: 'Test User',
                email: 'test@example.com'
            },
            topArtists: [
                {
                    id: 'artist1',
                    name: 'Test Artist 1',
                    genres: ['rock', 'alternative'],
                    popularity: 85
                }
            ],
            topTracks: [
                {
                    id: 'track1',
                    name: 'Test Track 1',
                    artists: [{ id: 'artist1', name: 'Test Artist 1' }],
                    album: 'Test Album'
                }
            ],
            genres: ['rock', 'alternative', 'pop'],
            playlists: [],
            followedArtists: [],
            recentlyPlayed: []
        };
        
        try {
            await spotifyService.saveSpotifyData(userId, sampleData);
            console.log('✅ Sample data saved successfully');
        } catch (error) {
            console.log('❌ Sample data save failed:', error.message);
        }
        
        // Test 6: Verify the saved data
        console.log('\n6️⃣ Verifying saved data...');
        const savedData = await spotifyService.getSpotifyData(userId);
        if (savedData) {
            console.log('✅ Data retrieved successfully');
            console.log(`   - User profile: ${savedData.userProfile?.display_name}`);
            console.log(`   - Top artists: ${savedData.topArtists?.length || 0}`);
            console.log(`   - Top tracks: ${savedData.topTracks?.length || 0}`);
            console.log(`   - Genres: ${savedData.genres?.length || 0}`);
        } else {
            console.log('❌ No data retrieved');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Get user ID from command line argument or default to 24
const userId = process.argv[2] || 24;
testSpotifySave(parseInt(userId)); 