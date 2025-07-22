# Database Migration Script
param(
    [string]$Command = "run"
)

Write-Host "🗄️  Database Migration System" -ForegroundColor Green

# Set working directory
Set-Location ".\backend"

# Check if database is accessible
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

# Run migrations
Write-Host "Running migrations..." -ForegroundColor Yellow
try {
    node database/migrate.js $Command
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Migrations failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to run migrations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Migration process completed!" -ForegroundColor Green 