# Create Brad@lynett.com User
# This script creates the user in the database

$baseUrl = "http://localhost:5001/api"

Write-Host "🎯 Creating Brad@lynett.com User" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Step 1: Register the user
Write-Host "`n1. Registering Brad@lynett.com..." -ForegroundColor Yellow
$registerBody = @{
    email = "brad@lynett.com"
    password = "Password123"
    firstName = "Brad"
    lastName = "Lynett"
    phone = "+1-555-0123"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ User created successfully!" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create user: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "💡 User already exists, proceeding to login test..." -ForegroundColor Yellow
    } else {
        exit 1
    }
}

# Step 2: Test login
Write-Host "`n2. Testing login..." -ForegroundColor Yellow
$loginBody = @{
    email = "brad@lynett.com"
    password = "Password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token received: $($token.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Add travel preferences
Write-Host "`n3. Adding travel preferences..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$preferencesBody = @{
    primaryAirport = "JFK"
    preferredAirlines = @("Delta", "United", "JetBlue")
    flightClass = "business"
    preferredHotelBrands = @("Marriott", "Hilton", "Hyatt")
    rentalCarPreference = "Hertz"
    rewardPrograms = @("Delta SkyMiles", "Hilton Honors", "Marriott Bonvoy")
} | ConvertTo-Json

try {
    $preferencesResponse = Invoke-RestMethod -Uri "$baseUrl/users/travel-preferences" -Method POST -Body $preferencesBody -Headers $headers
    Write-Host "✅ Travel preferences added successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to add travel preferences: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Preferences may already exist or there was an error" -ForegroundColor Yellow
}

Write-Host "`n🎉 User setup complete!" -ForegroundColor Green
Write-Host "💡 Now you can run the interest addition script" -ForegroundColor Cyan
Write-Host "💡 Run: .\scripts\add-brad-interests.ps1" -ForegroundColor Yellow 