# Test Enhanced Artist Matching System
Write-Host "🎵 Testing Enhanced Artist Matching System" -ForegroundColor Green

# Set the working directory to the backend folder
Set-Location ".\concert-travel-app\backend"

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

# Run the artist aliases migration
Write-Host "Running artist aliases migration..." -ForegroundColor Yellow
try {
    $migrationFile = ".\database\migrations\07_create_artist_aliases_table.sql"
    if (Test-Path $migrationFile) {
        $env:PGPASSWORD = "postgres"
        psql -h localhost -U postgres -d concert_travel_app -f $migrationFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Artist aliases migration completed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Run the enhanced artist matching test
Write-Host "Running enhanced artist matching tests..." -ForegroundColor Yellow
try {
    node .\scripts\test-enhanced-artist-matching.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Enhanced artist matching tests completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Tests failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test with a real user scenario
Write-Host "Testing with real user scenario..." -ForegroundColor Yellow
try {
    # Create a test user with artist interests
    $testUserQuery = @"
    INSERT INTO users (email, password_hash, first_name, last_name, city, state, created_at)
    VALUES ('test-artist-matching@example.com', 'test_hash', 'Test', 'User', 'New York', 'NY', CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO NOTHING
    RETURNING id;
"@

    $env:PGPASSWORD = "postgres"
    $userId = psql -h localhost -U postgres -d concert_travel_app -t -c $testUserQuery | Select-String -Pattern '\d+' | ForEach-Object { $_.Matches[0].Value }

    if ($userId) {
        Write-Host "Created test user with ID: $userId" -ForegroundColor Green
        
        # Add artist interests
        $interests = @(
            "INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($userId, 'artist', 'Taylor Swift', 1);",
            "INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($userId, 'artist', 'Drake', 2);",
            "INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($userId, 'artist', 'The Weeknd', 1);"
        )

        foreach ($interest in $interests) {
            psql -h localhost -U postgres -d concert_travel_app -c $interest | Out-Null
        }

        Write-Host "Added artist interests for test user" -ForegroundColor Green

        # Test trip suggestions
        node -e "
        const TripSuggestionEngine = require('./services/tripSuggestionEngine');
        const { pool } = require('./config/database');
        
        async function testUserSuggestions() {
            try {
                console.log('Testing trip suggestions for user $userId...');
                const suggestions = await TripSuggestionEngine.generateTripSuggestions($userId, 3);
                console.log('Generated suggestions:', suggestions.suggestions.length);
                suggestions.suggestions.forEach((s, i) => {
                    console.log(\`\${i + 1}. \${s.eventName} by \${s.artist} at \${s.venueName}\`);
                });
                console.log('✅ User scenario test completed');
            } catch (error) {
                console.error('❌ User scenario test failed:', error.message);
            } finally {
                await pool.end();
            }
        }
        
        testUserSuggestions();
        "

        # Clean up test user
        psql -h localhost -U postgres -d concert_travel_app -c "DELETE FROM user_interests WHERE user_id = $userId;" | Out-Null
        psql -h localhost -U postgres -d concert_travel_app -c "DELETE FROM users WHERE id = $userId;" | Out-Null
        Write-Host "Cleaned up test user" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to test user scenario: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎉 Enhanced Artist Matching System testing completed!" -ForegroundColor Green
Write-Host "The system now supports:" -ForegroundColor Cyan
Write-Host "  • Intelligent artist name variations and aliases" -ForegroundColor White
Write-Host "  • Fuzzy matching with confidence scoring" -ForegroundColor White
Write-Host "  • Special character handling (accents, punctuation)" -ForegroundColor White
Write-Host "  • Database-backed alias learning" -ForegroundColor White
Write-Host "  • Priority-based event ranking" -ForegroundColor White 