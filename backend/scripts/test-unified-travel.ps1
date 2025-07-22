# Test Unified Travel Service
# This script tests the unified travel service with multiple providers

Write-Host "🧪 Testing Unified Travel Service..." -ForegroundColor Cyan

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

# Test unified travel service health
Write-Host "`n🔍 Testing unified travel service health..." -ForegroundColor Cyan
try {
    $travelHealthResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/travel/health" -Method GET
    Write-Host "✅ Travel service health: $($travelHealthResponse.status)" -ForegroundColor Green
    
    if ($travelHealthResponse.providers) {
        Write-Host "   Providers:" -ForegroundColor Gray
        foreach ($provider in $travelHealthResponse.providers.PSObject.Properties) {
            $status = $provider.Value.status
            $color = if ($status -eq 'healthy') { 'Green' } else { 'Red' }
            Write-Host "     $($provider.Name): $status" -ForegroundColor $color
        }
    }
} catch {
    Write-Host "❌ Travel service health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test provider status
Write-Host "`n🔍 Testing provider status..." -ForegroundColor Cyan
Write-Host "This requires authentication. Please log in first to get a JWT token." -ForegroundColor Yellow

# Test airport search (no auth required for this test)
Write-Host "`n🔍 Testing unified airport search..." -ForegroundColor Cyan
try {
    $airportResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/travel/airports?keyword=LAX" -Method GET
    Write-Host "✅ Unified airport search successful" -ForegroundColor Green
    Write-Host "   Found $($airportResponse.data.Count) airports" -ForegroundColor Green
    Write-Host "   Providers used: $($airportResponse.providerCount)" -ForegroundColor Green
    
    if ($airportResponse.data.Count -gt 0) {
        Write-Host "   First result: $($airportResponse.data[0].name) ($($airportResponse.data[0].code))" -ForegroundColor Gray
        Write-Host "   Provider: $($airportResponse.data[0].searchProvider)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Unified airport search failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test flight search (requires authentication)
Write-Host "`n🔍 Testing unified flight search (requires auth)..." -ForegroundColor Cyan
Write-Host "This test requires a valid JWT token. Please log in first." -ForegroundColor Yellow

# Test hotel search (requires authentication)
Write-Host "`n🔍 Testing unified hotel search (requires auth)..." -ForegroundColor Cyan
Write-Host "This test requires a valid JWT token. Please log in first." -ForegroundColor Yellow

# Test car rental search (requires authentication)
Write-Host "`n🔍 Testing unified car rental search (requires auth)..." -ForegroundColor Cyan
Write-Host "This test requires a valid JWT token. Please log in first." -ForegroundColor Yellow

Write-Host "`n✅ Unified Travel Service test completed!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Register/login to get a JWT token" -ForegroundColor Yellow
Write-Host "2. Test authenticated endpoints with the token" -ForegroundColor Yellow
Write-Host "3. Add Amadeus API credentials when available" -ForegroundColor Yellow
Write-Host "4. Test provider fallback functionality" -ForegroundColor Yellow

Write-Host "`nProvider Configuration:" -ForegroundColor Cyan
Write-Host "- Amadeus: Requires AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET" -ForegroundColor Gray
Write-Host "- Skyscanner: Currently using mock provider" -ForegroundColor Gray
Write-Host "- Easy to add more providers later" -ForegroundColor Gray 