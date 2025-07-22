# Test Amadeus API Integration
# This script tests the travel API endpoints

Write-Host "🧪 Testing Amadeus API Integration..." -ForegroundColor Cyan

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    Write-Host "✅ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
}

# Check if Amadeus credentials are set
if (-not $env:AMADEUS_CLIENT_ID -or -not $env:AMADEUS_CLIENT_SECRET) {
    Write-Host "❌ Amadeus credentials not found!" -ForegroundColor Red
    Write-Host "Please set the following environment variables:" -ForegroundColor Yellow
    Write-Host "AMADEUS_CLIENT_ID=your_amadeus_client_id" -ForegroundColor Yellow
    Write-Host "AMADEUS_CLIENT_SECRET=your_amadeus_client_secret" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get these credentials:" -ForegroundColor Yellow
    Write-Host "1. Go to https://developers.amadeus.com/" -ForegroundColor Yellow
    Write-Host "2. Create a new app" -ForegroundColor Yellow
    Write-Host "3. Copy the API Key and API Secret" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Amadeus credentials found" -ForegroundColor Green

# Test server health
Write-Host "`n🔍 Testing server health..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method GET
    Write-Host "✅ Server health: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running on port 5001" -ForegroundColor Yellow
    exit 1
}

# Test travel service health
Write-Host "`n🔍 Testing travel service health..." -ForegroundColor Cyan
try {
    $travelHealthResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/travel/health" -Method GET
    Write-Host "✅ Travel service health: $($travelHealthResponse.status)" -ForegroundColor Green
    Write-Host "   Amadeus connection: $($travelHealthResponse.amadeus)" -ForegroundColor Green
} catch {
    Write-Host "❌ Travel service health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test airport search (no auth required for this test)
Write-Host "`n🔍 Testing airport search..." -ForegroundColor Cyan
try {
    $airportResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/travel/airports?keyword=LAX" -Method GET
    Write-Host "✅ Airport search successful" -ForegroundColor Green
    Write-Host "   Found $($airportResponse.data.Count) airports" -ForegroundColor Green
    if ($airportResponse.data.Count -gt 0) {
        Write-Host "   First result: $($airportResponse.data[0].name) ($($airportResponse.data[0].code))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Airport search failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test flight search (requires authentication)
Write-Host "`n🔍 Testing flight search (requires auth)..." -ForegroundColor Cyan
Write-Host "This test requires a valid JWT token. Please log in first." -ForegroundColor Yellow

# Test hotel search (requires authentication)
Write-Host "`n🔍 Testing hotel search (requires auth)..." -ForegroundColor Cyan
Write-Host "This test requires a valid JWT token. Please log in first." -ForegroundColor Yellow

# Test car rental search (requires authentication)
Write-Host "`n🔍 Testing car rental search (requires auth)..." -ForegroundColor Cyan
Write-Host "This test requires a valid JWT token. Please log in first." -ForegroundColor Yellow

Write-Host "`n✅ Amadeus API integration test completed!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Register/login to get a JWT token" -ForegroundColor Yellow
Write-Host "2. Test authenticated endpoints with the token" -ForegroundColor Yellow
Write-Host "3. Integrate with the trip suggestion engine" -ForegroundColor Yellow 