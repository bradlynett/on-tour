# Test Dashboard API Endpoints
# This script tests the API endpoints that the Dashboard component uses

$baseUrl = "http://localhost:5001/api"

Write-Host "🎯 Testing Dashboard API Endpoints" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Step 1: Login as brad@lynett.com
Write-Host "`n1. Logging in as brad@lynett.com..." -ForegroundColor Yellow
$loginBody = @{
    email = "brad@lynett.com"
    password = "Password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "   User: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test /auth/me endpoint
Write-Host "`n2. Testing /auth/me endpoint..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "✅ /auth/me successful!" -ForegroundColor Green
    Write-Host "   User ID: $($meResponse.data.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ /auth/me failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test /users/interests endpoint
Write-Host "`n3. Testing /users/interests endpoint..." -ForegroundColor Yellow
try {
    $interestsResponse = Invoke-RestMethod -Uri "$baseUrl/users/interests" -Method GET -Headers $headers
    Write-Host "✅ /users/interests successful!" -ForegroundColor Green
    Write-Host "   Interests count: $($interestsResponse.data.interests.Count)" -ForegroundColor Cyan
    if ($interestsResponse.data.interests.Count -gt 0) {
        Write-Host "   Sample interests:" -ForegroundColor Cyan
        $interestsResponse.data.interests | Select-Object -First 3 | ForEach-Object {
            Write-Host "     - $($_.interest_type): $($_.interest_value)" -ForegroundColor White
        }
    } else {
        Write-Host "   No interests found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ /users/interests failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test /trips endpoint
Write-Host "`n4. Testing /trips endpoint..." -ForegroundColor Yellow
try {
    $tripsResponse = Invoke-RestMethod -Uri "$baseUrl/trips" -Method GET -Headers $headers
    Write-Host "✅ /trips successful!" -ForegroundColor Green
    Write-Host "   Trip suggestions count: $($tripsResponse.data.suggestions.Count)" -ForegroundColor Cyan
    if ($tripsResponse.data.suggestions.Count -gt 0) {
        Write-Host "   Sample trip:" -ForegroundColor Cyan
        $sampleTrip = $tripsResponse.data.suggestions[0]
        Write-Host "     - Artist: $($sampleTrip.artist)" -ForegroundColor White
        Write-Host "     - Event: $($sampleTrip.event_name)" -ForegroundColor White
        Write-Host "     - Venue: $($sampleTrip.venue_name)" -ForegroundColor White
    } else {
        Write-Host "   No trip suggestions found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ /trips failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Dashboard API test complete!" -ForegroundColor Green 