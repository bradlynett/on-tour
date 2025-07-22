# Clean Spotify Data Script
# Removes corrupted Spotify data entries

Write-Host "Cleaning corrupted Spotify data..." -ForegroundColor Green

# Database connection details
$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_NAME = "concert_travel"
$DB_USER = "postgres"
$DB_PASSWORD = "password"

# SQL to clean corrupted data
$CLEAN_SQL = @"
-- Delete entries where music_data is not valid JSON or contains '[object Object]'
DELETE FROM spotify_data 
WHERE music_data::text LIKE '%[object Object]%' 
   OR music_data::text = 'null'
   OR music_data IS NULL;
"@

Write-Host "Cleaning SQL:" -ForegroundColor Yellow
Write-Host $CLEAN_SQL -ForegroundColor Gray

# Execute the cleanup using psql
try {
    $env:PGPASSWORD = $DB_PASSWORD
    
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $CLEAN_SQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Spotify data cleanup completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Cleanup failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Error output: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "Error running cleanup: $_" -ForegroundColor Red
} finally {
    $env:PGPASSWORD = ""
}

Write-Host "Cleanup script completed." -ForegroundColor Green 