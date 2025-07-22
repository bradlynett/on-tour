# Run Migration 05: Add preferred destinations to travel preferences
# This script adds the preferred_destinations field to the travel_preferences table

Write-Host "🔄 Running Migration 05: Add preferred destinations..." -ForegroundColor Yellow

# Set the working directory to the backend folder
Set-Location "C:\Users\bradl\OneDrive\Desktop\Concert Travel App\concert-travel-app\backend"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Database connection details
$DB_HOST = $env:DB_HOST ?? "localhost"
$DB_PORT = $env:DB_PORT ?? "5432"
$DB_NAME = $env:DB_NAME ?? "concert_travel_db"
$DB_USER = $env:DB_USER ?? "postgres"
$DB_PASSWORD = $env:DB_PASSWORD ?? "password"

Write-Host "📊 Database: $DB_NAME on $DB_HOST:$DB_PORT" -ForegroundColor Cyan

try {
    # Run the migration
    $migrationSQL = Get-Content "database\migrations\05_add_preferred_destinations.sql" -Raw
    
    # Use psql to execute the migration
    $env:PGPASSWORD = $DB_PASSWORD
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $migrationSQL 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 05 completed successfully!" -ForegroundColor Green
        Write-Host "📝 Added preferred_destinations field to travel_preferences table" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Migration failed:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error running migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Migration 05 completed!" -ForegroundColor Green 