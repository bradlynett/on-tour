# Simple Authentication Test
Write-Host "🔍 Simple Authentication Test..." -ForegroundColor Yellow

# Test 1: Check backend health
Write-Host "`n1. Testing backend health..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method GET
    Write-Host "✅ Backend is running" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Check if user exists
Write-Host "`n2. Checking if user exists..." -ForegroundColor Cyan
try {
    $userResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/check/brad@lynett.com" -Method GET
    Write-Host "✅ User check successful" -ForegroundColor Green
    Write-Host "   User exists: $($userResponse.exists)" -ForegroundColor Gray
    if ($userResponse.exists) {
        Write-Host "   Name: $($userResponse.data.firstName) $($userResponse.data.lastName)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ User check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test login
Write-Host "`n3. Testing login..." -ForegroundColor Cyan
$loginBody = @{
    email = "brad@lynett.com"
    password = "TestPassword1"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token received: $($loginResponse.data.token.Length) characters" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔍 Test complete!" -ForegroundColor Yellow 