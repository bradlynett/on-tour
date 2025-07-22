# Setup Events System
Write-Host "🎵 Setting up Events System for Concert Travel App..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

# Step 1: Run the events migration
Write-Host "`n1️⃣ Running events table migration..." -ForegroundColor Yellow
try {
    $migrationFile = "database\migrations\06_create_events_table.sql"
    if (Test-Path $migrationFile) {
        $env:PGPASSWORD = "password"
        psql -h localhost -p 5433 -U postgres -d concert_travel -f $migrationFile
        Write-Host "✅ Events table migration completed" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check if Ticketmaster API key is configured
Write-Host "`n2️⃣ Checking Ticketmaster API configuration..." -ForegroundColor Yellow
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $hasApiKey = $envContent | Where-Object { $_ -match "TICKETMASTER_API_KEY" }
    
    if ($hasApiKey) {
        Write-Host "✅ Ticketmaster API key found in .env file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  TICKETMASTER_API_KEY not found in .env file" -ForegroundColor Yellow
        Write-Host "`n🔑 To get a Ticketmaster API key:" -ForegroundColor Cyan
        Write-Host "1. Go to https://developer-acct.ticketmaster.com/" -ForegroundColor White
        Write-Host "2. Create a new account or sign in" -ForegroundColor White
        Write-Host "3. Create a new application" -ForegroundColor White
        Write-Host "4. Copy your API key" -ForegroundColor White
        Write-Host "5. Add TICKETMASTER_API_KEY=your_api_key to your .env file" -ForegroundColor White
        Write-Host "6. Restart the server" -ForegroundColor White
        Write-Host "`n⏭️  Skipping API test until API key is configured" -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

# Step 3: Test Ticketmaster API integration
Write-Host "`n3️⃣ Testing Ticketmaster API integration..." -ForegroundColor Yellow
try {
    node scripts/test-ticketmaster-api.js
    Write-Host "✅ Ticketmaster API test completed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error testing Ticketmaster API: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Test API endpoints
Write-Host "`n4️⃣ Testing API endpoints..." -ForegroundColor Yellow
try {
    # Start server in background
    Write-Host "Starting server for endpoint testing..." -ForegroundColor Gray
    $serverProcess = Start-Process node -ArgumentList "server.js" -PassThru -WindowStyle Hidden
    
    # Wait for server to start
    Start-Sleep -Seconds 5
    
    # Test endpoints
    $baseUrl = "http://localhost:5001"
    
    # Test health endpoint
    try {
        $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
        Write-Host "✅ Health endpoint working" -ForegroundColor Green
    } catch {
        Write-Host "❌ Health endpoint failed: $_" -ForegroundColor Red
    }
    
    # Test events endpoint (will fail without auth, but that's expected)
    try {
        $eventsResponse = Invoke-RestMethod -Uri "$baseUrl/api/events" -Method Get
        Write-Host "✅ Events endpoint working" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ Events endpoint working (auth required as expected)" -ForegroundColor Green
        } else {
            Write-Host "❌ Events endpoint failed: $_" -ForegroundColor Red
        }
    }
    
    # Stop server
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "✅ API endpoint testing completed" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error testing API endpoints: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Events system setup completed!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the backend server: npm start" -ForegroundColor White
Write-Host "2. Test the frontend integration" -ForegroundColor White
Write-Host "3. Use the API endpoints to search and save events" -ForegroundColor White
Write-Host "`n🔗 API Endpoints:" -ForegroundColor Cyan
Write-Host "GET /api/events/search - Search events" -ForegroundColor White
Write-Host "GET /api/events/search/artist/:name - Search by artist" -ForegroundColor White
Write-Host "GET /api/events/search/city/:city - Search by city" -ForegroundColor White
Write-Host "GET /api/events/upcoming - Get upcoming events" -ForegroundColor White
Write-Host "POST /api/events/save - Save event to database" -ForegroundColor White 