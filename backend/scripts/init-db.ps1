# Database initialization script for Concert Travel App
Write-Host "🚀 Initializing Concert Travel App Database..." -ForegroundColor Green

# Check if Docker is running
Write-Host "📋 Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start the database
Write-Host "🐘 Starting PostgreSQL database..." -ForegroundColor Yellow
docker-compose up -d

# Wait for database to be ready
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if database is accessible
Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "password"
    psql -h localhost -p 5433 -U postgres -d concert_travel -c "SELECT 1;" 2>$null
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Database connection failed. Retrying..." -ForegroundColor Red
    Start-Sleep -Seconds 5
    try {
        psql -h localhost -p 5433 -U postgres -d concert_travel -c "SELECT 1;" 2>$null
        Write-Host "✅ Database connection successful on retry" -ForegroundColor Green
    } catch {
        Write-Host "❌ Database connection failed. Please check Docker and try again." -ForegroundColor Red
        exit 1
    }
}

# Initialize schema and seed data
Write-Host "📊 Initializing database schema..." -ForegroundColor Yellow
try {
    # Run schema initialization
    psql -h localhost -p 5433 -U postgres -d concert_travel -f database/init/01-schema.sql
    Write-Host "✅ Schema initialized" -ForegroundColor Green
    
    # Run seed data
    psql -h localhost -p 5433 -U postgres -d concert_travel -f database/init/02-seed.sql
    Write-Host "✅ Seed data loaded" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Database initialization failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Database initialization complete!" -ForegroundColor Green
Write-Host "📋 You can now start the backend server with: npm run dev" -ForegroundColor Cyan 