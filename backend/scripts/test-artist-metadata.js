// Test script for artist metadata functionality
const ArtistMetadataService = require('../services/artistMetadataService');
const TripSuggestionEngine = require('../services/tripSuggestionEngine');
const { pool } = require('../config/database');

async function testArtistMetadata() {
    console.log('🎵 Testing Artist Metadata System\n');

    try {
        // Test 1: Basic metadata retrieval
        console.log('1. Testing basic metadata retrieval:');
        const testArtists = [
            'Taylor Swift',
            'Drake',
            'Beyoncé',
            'Bad Bunny',
            'The Weeknd'
        ];

        for (const artist of testArtists) {
            const metadata = await ArtistMetadataService.getArtistMetadata(artist);
            if (metadata) {
                console.log(`   "${artist}": ${metadata.genres?.join(', ') || 'No genres'} (Popularity: ${metadata.popularity_score})`);
            } else {
                console.log(`   "${artist}": No metadata found`);
            }
        }

        // Test 2: Genre-based search
        console.log('\n2. Testing genre-based search:');
        const testGenres = ['Pop', 'Hip Hop', 'R&B', 'Latin'];
        
        for (const genre of testGenres) {
            const artists = await ArtistMetadataService.searchArtistsByGenre(genre, 5);
            console.log(`   "${genre}": ${artists.length} artists found`);
            artists.slice(0, 3).forEach(artist => {
                console.log(`     - ${artist.artist_name} (${artist.popularity_score})`);
            });
        }

        // Test 3: Similar artists
        console.log('\n3. Testing similar artists:');
        const similarArtists = await ArtistMetadataService.getSimilarArtists('Taylor Swift', 5);
        console.log(`   Similar to "Taylor Swift": ${similarArtists.length} artists`);
        similarArtists.forEach(artist => {
            console.log(`     - ${artist.artist_name} (Score: ${artist.similarity_score?.toFixed(1)})`);
        });

        // Test 4: Popular artists by genre
        console.log('\n4. Testing popular artists by genre:');
        const popularPop = await ArtistMetadataService.getPopularArtistsByGenre('Pop', 5);
        console.log(`   Popular Pop artists: ${popularPop.length} found`);
        popularPop.forEach(artist => {
            console.log(`     - ${artist.artist_name} (${artist.popularity_score})`);
        });

        // Test 5: Artist recommendations
        console.log('\n5. Testing artist recommendations:');
        const mockInterests = [
            { interest_type: 'artist', interest_value: 'Taylor Swift', priority: 1 },
            { interest_type: 'genre', interest_value: 'Pop', priority: 2 },
            { interest_type: 'artist', interest_value: 'Drake', priority: 1 }
        ];
        
        const recommendations = await ArtistMetadataService.getArtistRecommendations(mockInterests, 5);
        console.log(`   Recommendations: ${recommendations.length} artists`);
        recommendations.forEach(artist => {
            console.log(`     - ${artist.artist_name} (Score: ${artist.recommendation_score?.toFixed(1)})`);
        });

        // Test 6: Enhanced trip suggestions with metadata
        console.log('\n6. Testing enhanced trip suggestions:');
        
        // Create a test user with interests
        const testUserQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, city, state, created_at)
            VALUES ('test-metadata@example.com', 'test_hash', 'Test', 'User', 'New York', 'NY', CURRENT_TIMESTAMP)
            ON CONFLICT (email) DO NOTHING
            RETURNING id;
        `;
        
        const userResult = await pool.query(testUserQuery);
        const userId = userResult.rows[0]?.id;
        
        if (userId) {
            // Add interests
            const interests = [
                "INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($1, 'artist', 'Taylor Swift', 1);",
                "INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($1, 'genre', 'Pop', 2);",
                "INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($1, 'artist', 'Drake', 1);"
            ];

            for (const interest of interests) {
                await pool.query(interest, [userId]);
            }

            // Test enhanced matching
            const enhancedEvents = await TripSuggestionEngine.findMatchingEvents(userId);
            console.log(`   Enhanced matching found ${enhancedEvents.events.length} events`);
            
            // Test artist recommendations
            const userRecommendations = await TripSuggestionEngine.getArtistRecommendationsForUser(userId, 5);
            console.log(`   User recommendations: ${userRecommendations.length} artists`);
            userRecommendations.forEach(artist => {
                console.log(`     - ${artist.artist_name} (Score: ${artist.recommendation_score?.toFixed(1)})`);
            });

            // Clean up
            await pool.query("DELETE FROM user_interests WHERE user_id = $1", [userId]);
            await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        }

        // Test 7: Metadata operations
        console.log('\n7. Testing metadata operations:');
        
        // Test upsert
        const testMetadata = {
            artist_name: 'Test Artist',
            genres: ['Test Genre', 'Experimental'],
            popularity_score: 75,
            followers_count: 1000000,
            country: 'Test Country',
            biography: 'This is a test artist for metadata testing.'
        };
        
        const upserted = await ArtistMetadataService.upsertArtistMetadata(testMetadata);
        console.log(`   Upserted metadata for: ${upserted.artist_name}`);
        
        // Test update popularity
        await ArtistMetadataService.updatePopularityScore('Test Artist', 85);
        console.log(`   Updated popularity score for Test Artist`);
        
        // Test add tags
        await ArtistMetadataService.addArtistTags('Test Artist', 'test-tag');
        console.log(`   Added tag to Test Artist`);
        
        // Verify updates
        const updatedMetadata = await ArtistMetadataService.getArtistMetadata('Test Artist');
        console.log(`   Updated metadata - Popularity: ${updatedMetadata.popularity_score}, Tags: ${updatedMetadata.tags?.join(', ')}`);

        // Test 8: Search functionality
        console.log('\n8. Testing search functionality:');
        const searchResults = await ArtistMetadataService.searchArtists({
            query: 'Taylor',
            genres: ['Pop'],
            minPopularity: 80,
            limit: 5
        });
        console.log(`   Search results: ${searchResults.length} artists found`);
        searchResults.forEach(artist => {
            console.log(`     - ${artist.artist_name} (${artist.popularity_score})`);
        });

        // Test 9: Genre statistics
        console.log('\n9. Testing genre statistics:');
        const genreStats = await ArtistMetadataService.getGenreStatistics();
        console.log(`   Genre statistics: ${genreStats.length} genres`);
        genreStats.slice(0, 5).forEach(stat => {
            console.log(`     - ${stat.genre}: ${stat.artist_count} artists, avg popularity ${stat.avg_popularity?.toFixed(1)}`);
        });

        // Test 10: Cache functionality
        console.log('\n10. Testing cache functionality:');
        const cacheStats = ArtistMetadataService.getCacheStats();
        console.log(`   Cache stats: ${cacheStats.size} items, timeout: ${cacheStats.timeout}ms`);
        
        // Test cache hit
        const startTime = Date.now();
        await ArtistMetadataService.getArtistMetadata('Taylor Swift');
        const firstCall = Date.now() - startTime;
        
        const startTime2 = Date.now();
        await ArtistMetadataService.getArtistMetadata('Taylor Swift');
        const secondCall = Date.now() - startTime2;
        
        console.log(`   First call: ${firstCall}ms, Second call: ${secondCall}ms (cached)`);

        console.log('\n✅ All artist metadata tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
if (require.main === module) {
    testArtistMetadata();
}

module.exports = { testArtistMetadata }; 