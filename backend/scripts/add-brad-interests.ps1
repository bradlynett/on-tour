# Add Interests for Brad@lynett.com
# This script adds sample interests to enable trip suggestions

$baseUrl = "http://localhost:5001/api"
$email = "brad@lynett.com"
$password = "password"

Write-Host "🎯 Adding Interests for Brad@lynett.com" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Step 1: Login to get token
Write-Host "`n1. Logging in as Brad..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure the user brad@lynett.com exists in the database" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Define interests to add
$interestsToAdd = @(
    @{ interestType = "artist"; interestValue = "Taylor Swift"; priority = 1 },
    @{ interestType = "artist"; interestValue = "Ed Sheeran"; priority = 2 },
    @{ interestType = "artist"; interestValue = "Beyoncé"; priority = 1 },
    @{ interestType = "genre"; interestValue = "Pop"; priority = 1 },
    @{ interestType = "genre"; interestValue = "R&B"; priority = 2 },
    @{ interestType = "venue"; interestValue = "Madison Square Garden"; priority = 1 },
    @{ interestType = "venue"; interestValue = "United Center"; priority = 2 },
    @{ interestType = "city"; interestValue = "New York"; priority = 1 },
    @{ interestType = "city"; interestValue = "Chicago"; priority = 2 },
    @{ interestType = "city"; interestValue = "Los Angeles"; priority = 3 }
)

# Step 3: Add interests
Write-Host "`n2. Adding interests..." -ForegroundColor Yellow
$addedCount = 0

foreach ($interest in $interestsToAdd) {
    try {
        $interestBody = $interest | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$baseUrl/users/interests" -Method POST -Body $interestBody -Headers $headers
        Write-Host "✅ Added: $($interest.interestType) - $($interest.interestValue)" -ForegroundColor Green
        $addedCount++
    } catch {
        Write-Host "❌ Failed to add $($interest.interestType) - $($interest.interestValue): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n3. Verifying interests..." -ForegroundColor Yellow
try {
    $interestsResponse = Invoke-RestMethod -Uri "$baseUrl/users/interests" -Method GET -Headers $headers
    $interests = $interestsResponse.data.interests
    Write-Host "✅ Total interests: $($interests.Count)" -ForegroundColor Green
    foreach ($interest in $interests) {
        Write-Host "   - $($interest.interestType): $($interest.interestValue) (Priority: $($interest.priority))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Failed to verify interests: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Interest addition complete!" -ForegroundColor Green
Write-Host "💡 Now you can run the trip suggestion generation script" -ForegroundColor Cyan
Write-Host "💡 Run: .\test-brad-trip-suggestions.ps1" -ForegroundColor Yellow 