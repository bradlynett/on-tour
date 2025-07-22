# Database Setup Script for Local PostgreSQL
# This script sets up the database schema and seed data

Write-Host "Setting up Concert Travel App Database..." -ForegroundColor Green

# Check if psql is available
try {
    $psqlVersion = psql --version
    Write-Host "PostgreSQL found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Database connection parameters
$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_NAME = "concert_travel"
$DB_USER = "postgres"
$DB_PASSWORD = "password"

# Create database if it doesn't exist
Write-Host "Creating database '$DB_NAME' if it doesn't exist..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASSWORD
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>$null

# Run schema
Write-Host "Running database schema..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "database/init/01-schema.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Schema applied successfully!" -ForegroundColor Green
} else {
    Write-Host "Error applying schema!" -ForegroundColor Red
    exit 1
}

# Run seed data
Write-Host "Seeding database with test data..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "database/init/02-seed.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Seed data applied successfully!" -ForegroundColor Green
} else {
    Write-Host "Error applying seed data!" -ForegroundColor Red
    exit 1
}

# Verify setup
Write-Host "Verifying database setup..." -ForegroundColor Yellow
$userCount = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;"
$eventCount = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM events;"

Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host "Users: $userCount" -ForegroundColor Cyan
Write-Host "Events: $eventCount" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start your server with: npm run dev" -ForegroundColor Yellow 