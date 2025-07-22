# Clean User Spotify Data Script
# Removes Spotify data for a specific user

param(
    [Parameter(Mandatory=$true)]
    [int]$UserId
)

Write-Host "Cleaning Spotify data for user $UserId..." -ForegroundColor Green

# Database connection details
$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_NAME = "concert_travel"
$DB_USER = "postgres"
$DB_PASSWORD = "password"

# SQL to clean data for specific user
$CLEAN_SQL = @"
-- Delete Spotify data for specific user
DELETE FROM spotify_data WHERE user_id = $UserId;

-- Also clean tokens for this user
DELETE FROM spotify_tokens WHERE user_id = $UserId;
"@

Write-Host "Cleaning SQL:" -ForegroundColor Yellow
Write-Host $CLEAN_SQL -ForegroundColor Gray

# Execute the cleanup using psql
try {
    $env:PGPASSWORD = $DB_PASSWORD
    
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $CLEAN_SQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Spotify data cleanup for user $UserId completed successfully!" -ForegroundColor Green
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