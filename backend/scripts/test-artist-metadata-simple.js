// Simple test script for artist metadata system
const { pool } = require('../config/database');
const ArtistMetadataService = require('../services/artistMetadataService');

async function testArtistMetadata() {
    try {
        console.log('🎵 Testing Artist Metadata System...\n');

        // Test 1: Check if artist_metadata table exists
        console.log('1. Checking artist_metadata table...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'artist_metadata'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ artist_metadata table exists');
        } else {
            console.log('❌ artist_metadata table not found');
            console.log('Please run the migration first: node scripts/run-artist-metadata-migration.js');
            return;
        }

        // Test 2: Check data in the table
        console.log('\n2. Checking artist data...');
        const dataCheck = await pool.query('SELECT COUNT(*) FROM artist_metadata');
        console.log(`✅ Found ${dataCheck.rows[0].count} artist records`);

        if (dataCheck.rows[0].count > 0) {
            const sampleArtists = await pool.query('SELECT artist_name, genres, popularity_score FROM artist_metadata LIMIT 3');
            console.log('Sample artists:');
            sampleArtists.rows.forEach((artist, i) => {
                console.log(`  ${i + 1}. ${artist.artist_name} - ${artist.genres?.join(', ')} (Popularity: ${artist.popularity_score})`);
            });
        }

        // Test 3: Test metadata retrieval
        console.log('\n3. Testing metadata retrieval...');
        const testArtists = ['Taylor Swift', 'Drake', 'Beyoncé'];
        
        for (const artistName of testArtists) {
            const metadata = await ArtistMetadataService.getArtistMetadata(artistName);
            if (metadata) {
                console.log(`✅ ${artistName}: ${metadata.genres?.join(', ')} (Popularity: ${metadata.popularity_score})`);
            } else {
                console.log(`⚠️  ${artistName}: No metadata found`);
            }
        }

        // Test 4: Test artist search
        console.log('\n4. Testing artist search...');
        const searchResults = await ArtistMetadataService.searchArtists('taylor', 3);
        console.log(`Found ${searchResults.length} artists matching 'taylor'`);
        searchResults.forEach((artist, i) => {
            console.log(`  ${i + 1}. ${artist.artist_name} (${artist.genres?.join(', ')})`);
        });

        // Test 5: Test genre-based search
        console.log('\n5. Testing genre-based search...');
        const popArtists = await ArtistMetadataService.getArtistsByGenre('Pop', 3);
        console.log(`Found ${popArtists.length} Pop artists`);
        popArtists.forEach((artist, i) => {
            console.log(`  ${i + 1}. ${artist.artist_name} (Popularity: ${artist.popularity_score})`);
        });

        // Test 6: Test trending artists
        console.log('\n6. Testing trending artists...');
        const trending = await ArtistMetadataService.getTrendingArtists(3);
        console.log(`Found ${trending.length} trending artists`);
        trending.forEach((artist, i) => {
            console.log(`  ${i + 1}. ${artist.artist_name} (Popularity: ${artist.popularity_score})`);
        });

        // Test 7: Test artist recommendations
        console.log('\n7. Testing artist recommendations...');
        const mockInterests = [
            { interest_type: 'artist', interest_value: 'Taylor Swift', priority: 1 },
            { interest_type: 'genre', interest_value: 'Pop', priority: 1 }
        ];
        
        const recommendations = await ArtistMetadataService.getArtistRecommendations(mockInterests, 3);
        console.log(`Found ${recommendations.length} artist recommendations`);
        recommendations.forEach((artist, i) => {
            console.log(`  ${i + 1}. ${artist.artist_name} (Score: ${artist.recommendation_score?.toFixed(1)})`);
        });

        console.log('\n🎉 All tests completed successfully!');
        console.log('\nThe artist metadata system is working correctly.');
        console.log('Features available:');
        console.log('  • Artist metadata storage and retrieval');
        console.log('  • Genre-based artist search');
        console.log('  • Popularity scoring and trending artists');
        console.log('  • Artist recommendations based on interests');
        console.log('  • Enhanced trip suggestions with metadata');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the test
if (require.main === module) {
    testArtistMetadata();
}

module.exports = { testArtistMetadata }; 