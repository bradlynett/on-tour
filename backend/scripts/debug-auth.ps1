# Debug Authentication Issues
Write-Host "🔍 Debugging Authentication Issues..." -ForegroundColor Yellow

# Test 1: Check if backend is running
Write-Host "`n1. Testing backend health..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend is running" -ForegroundColor Green
    Write-Host "   Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Check if user exists in database
Write-Host "`n2. Checking if user exists in database..." -ForegroundColor Cyan
try {
    $userResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/check/brad@lynett.com" -Method GET -TimeoutSec 5
    Write-Host "✅ User check endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($userResponse | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ User check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test login with different passwords
Write-Host "`n3. Testing login with common passwords..." -ForegroundColor Cyan

$testPasswords = @(
    "Password123!",
    "password123",
    "Password123",
    "password",
    "123456",
    "admin",
    "test123"
)

foreach ($password in $testPasswords) {
    Write-Host "   Testing password: $password" -ForegroundColor Gray
    try {
        $loginBody = @{
            email = "brad@lynett.com"
            password = $password
        } | ConvertTo-Json

        $loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 5
        
        if ($loginResponse.success) {
            Write-Host "   ✅ SUCCESS with password: $password" -ForegroundColor Green
            Write-Host "   Token: $($loginResponse.data.token.Substring(0, 20))..." -ForegroundColor Gray
            break
        } else {
            Write-Host "   ❌ Failed: $($loginResponse.message)" -ForegroundColor Red
        }
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   ❌ HTTP $($errorResponse.StatusCode): $responseBody" -ForegroundColor Red
        } else {
            Write-Host "   ❌ Network error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Test 4: Check environment variables
Write-Host "`n4. Checking environment variables..." -ForegroundColor Cyan
try {
    $envResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/admin/env-check" -Method GET -TimeoutSec 5
    Write-Host "✅ Environment check successful" -ForegroundColor Green
    Write-Host "   JWT_SECRET set: $($envResponse.jwtSecretSet)" -ForegroundColor Gray
    Write-Host "   Database connected: $($envResponse.databaseConnected)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Environment check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Test with curl (if available)
Write-Host "`n5. Testing with curl..." -ForegroundColor Cyan
try {
    $curlOutput = curl -s -X POST http://localhost:5001/api/auth/login `
        -H "Content-Type: application/json" `
        -d '{"email":"brad@lynett.com","password":"Password123!"}'
    
    Write-Host "   Curl response: $curlOutput" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Curl test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔍 Debug complete!" -ForegroundColor Yellow 