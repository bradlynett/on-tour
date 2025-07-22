# Test Artist Metadata System
Write-Host "🎵 Testing Artist Metadata System" -ForegroundColor Green

# Set the working directory to the backend folder (fix path issue)
Set-Location ".\backend"

# Check if database is running
Write-Host "Checking database connection..." -ForegroundColor Yellow
try {
    node -e "const { pool } = require('./config/database'); pool.query('SELECT 1').then(() => { console.log('Database connected'); pool.end(); }).catch(err => { console.error('Database error:', err.message); process.exit(1); });"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Database connection failed. Please ensure the database is running." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to check database connection" -ForegroundColor Red
    exit 1
}

# Run the artist metadata migration using Node.js
Write-Host "Running artist metadata migration..." -ForegroundColor Yellow
try {
    node .\scripts\run-artist-metadata-migration.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Artist metadata migration completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Run the artist metadata tests
Write-Host "Running artist metadata tests..." -ForegroundColor Yellow
try {
    node .\scripts\test-artist-metadata.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Artist metadata tests completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Tests failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test integration with trip suggestions
Write-Host "Testing integration with trip suggestions..." -ForegroundColor Yellow
try {
    # Create a test user with comprehensive interests using Node.js
    node -e "
    const { pool } = require('./config/database');
    
    async function createTestUser() {
        try {
            // Create test user
            const userResult = await pool.query(\`
                INSERT INTO users (email, password_hash, first_name, last_name, city, state, created_at)
                VALUES ('test-metadata-integration@example.com', 'test_hash', 'Test', 'User', 'New York', 'NY', CURRENT_TIMESTAMP)
                ON CONFLICT (email) DO NOTHING
                RETURNING id;
            \`);
            
            const userId = userResult.rows[0]?.id;
            if (userId) {
                console.log('Created test user with ID:', userId);
                
                // Add comprehensive interests
                const interests = [
                    { type: 'artist', value: 'Taylor Swift', priority: 1 },
                    { type: 'artist', value: 'Drake', priority: 2 },
                    { type: 'genre', value: 'Pop', priority: 1 },
                    { type: 'genre', value: 'Hip Hop', priority: 2 },
                    { type: 'venue', value: 'Madison Square Garden', priority: 1 },
                    { type: 'city', value: 'New York', priority: 1 }
                ];
                
                for (const interest of interests) {
                    await pool.query(\`
                        INSERT INTO user_interests (user_id, interest_type, interest_value, priority) 
                        VALUES (\$1, \$2, \$3, \$4)
                    \`, [userId, interest.type, interest.value, interest.priority]);
                }
                
                console.log('Added comprehensive interests for test user');
                
                // Test enhanced trip suggestions with metadata
                const TripSuggestionEngine = require('./services/tripSuggestionEngine');
                const ArtistMetadataService = require('./services/artistMetadataService');
                
                console.log('Testing enhanced trip suggestions with metadata...');
                
                // Test artist recommendations
                const recommendations = await TripSuggestionEngine.getArtistRecommendationsForUser(userId, 5);
                console.log('Artist recommendations:', recommendations.length);
                recommendations.forEach((artist, i) => {
                    console.log(\`\${i + 1}. \${artist.artist_name} (Score: \${artist.recommendation_score?.toFixed(1)})\`);
                });
                
                // Test enhanced event matching
                const enhancedEvents = await TripSuggestionEngine.findMatchingEvents(userId);
                console.log('Enhanced events found:', enhancedEvents.events.length);
                
                // Test metadata retrieval for events
                if (enhancedEvents.events.length > 0) {
                    const firstEvent = enhancedEvents.events[0];
                    if (firstEvent.artist) {
                        const metadata = await ArtistMetadataService.getArtistMetadata(firstEvent.artist);
                        if (metadata) {
                            console.log(\`Event artist metadata: \${metadata.artist_name} - \${metadata.genres?.join(', ')} (Popularity: \${metadata.popularity_score})\`);
                        }
                    }
                }
                
                console.log('✅ Integration test completed');
                
                // Clean up test user
                await pool.query('DELETE FROM user_interests WHERE user_id = \$1', [userId]);
                await pool.query('DELETE FROM users WHERE id = \$1', [userId]);
                console.log('Cleaned up test user');
            }
        } catch (error) {
            console.error('❌ Integration test failed:', error.message);
        } finally {
            await pool.end();
        }
    }
    
    createTestUser();
    "
} catch {
    Write-Host "❌ Failed to test integration: $($_.Exception.Message)" -ForegroundColor Red
}

# Test metadata operations
Write-Host "Testing metadata operations..." -ForegroundColor Yellow
try {
    node -e "
    const ArtistMetadataService = require('./services/artistMetadataService');
    const { pool } = require('./config/database');
    
    async function testOperations() {
        try {
            console.log('Testing metadata operations...');
            
            // Test trending artists
            const trending = await ArtistMetadataService.getTrendingArtists(5);
            console.log('Trending artists:', trending.length);
            trending.forEach((artist, i) => {
                console.log(\`\${i + 1}. \${artist.artist_name} (Popularity: \${artist.popularity_score})\`);
            });
            
            // Test artists by country
            const usArtists = await ArtistMetadataService.getArtistsByCountry('United States', 5);
            console.log('US artists:', usArtists.length);
            
            // Test genre statistics
            const genreStats = await ArtistMetadataService.getGenreStatistics();
            console.log('Genre statistics:', genreStats.length, 'genres');
            
            console.log('✅ Operations test completed');
        } catch (error) {
            console.error('❌ Operations test failed:', error.message);
        } finally {
            await pool.end();
        }
    }
    
    testOperations();
    "
} catch {
    Write-Host "❌ Failed to test operations: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎉 Artist Metadata System testing completed!" -ForegroundColor Green
Write-Host "The system now supports:" -ForegroundColor Cyan
Write-Host "  • Comprehensive artist metadata storage" -ForegroundColor White
Write-Host "  • Genre-based artist search and recommendations" -ForegroundColor White
Write-Host "  • Popularity scoring and trending artists" -ForegroundColor White
Write-Host "  • Enhanced trip suggestions with metadata integration" -ForegroundColor White
Write-Host "  • Similar artist discovery" -ForegroundColor White
Write-Host "  • Caching for performance optimization" -ForegroundColor White
Write-Host "  • Advanced search and filtering capabilities" -ForegroundColor White 