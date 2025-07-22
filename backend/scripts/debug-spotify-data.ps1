# Debug Spotify Data Script
# Shows what's actually stored in the spotify_data table

Write-Host "Debugging Spotify data in database..." -ForegroundColor Green

# Database connection details
$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_NAME = "concert_travel"
$DB_USER = "postgres"
$DB_PASSWORD = "password"

# SQL to check all spotify_data entries
$DEBUG_SQL = @"
-- Show all entries in spotify_data table
SELECT 
    user_id,
    music_data::text as music_data_text,
    LENGTH(music_data::text) as data_length,
    created_at,
    updated_at
FROM spotify_data
ORDER BY user_id;
"@

Write-Host "Debug SQL:" -ForegroundColor Yellow
Write-Host $DEBUG_SQL -ForegroundColor Gray

# Execute the debug query using psql
try {
    $env:PGPASSWORD = $DB_PASSWORD
    
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $DEBUG_SQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Debug query completed successfully!" -ForegroundColor Green
        Write-Host "Results:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Gray
    } else {
        Write-Host "Debug query failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Error output: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "Error running debug query: $_" -ForegroundColor Red
} finally {
    $env:PGPASSWORD = ""
}

Write-Host "Debug script completed." -ForegroundColor Green 