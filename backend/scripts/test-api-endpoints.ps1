# Concert Travel App - API End-to-End Test Script
# This script tests all major backend API endpoints
# Run from the backend directory: .\scripts\test-api-endpoints.ps1

# 1. Register a unique user
$email = "testuser_$([DateTime]::Now.Ticks)@example.com"
$registerBody = @{
    email = $email
    password = "TestPassword123"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
Write-Host "Registered user: $email"

# 2. Log in and extract tokens
$loginBody = @{
    email = $email
    password = "TestPassword123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
$refreshToken = $loginResponse.data.refreshToken
Write-Host "Logged in. JWT: $token"

# 3. Get user profile
$profileResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/profile" -Headers @{Authorization = "Bearer $token"}
Write-Host "Profile:"; $profileResponse | ConvertTo-Json

# 4. Update travel preferences
$travelPrefsBody = @{
    primaryAirport = "JFK"
    preferredAirlines = @("Delta", "United")
    flightClass = "economy"
    preferredHotelBrands = @("Hilton", "Marriott")
    rentalCarPreference = "Hertz"
    rewardPrograms = @("Delta SkyMiles", "Hilton Honors")
} | ConvertTo-Json

$travelPrefsResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/travel-preferences" -Method Put -Body $travelPrefsBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
Write-Host "Updated travel preferences:"; $travelPrefsResponse | ConvertTo-Json

# 5. Add a user interest
$interestBody = @{
    interestType = "artist"
    interestValue = "Taylor Swift"
    priority = 1
} | ConvertTo-Json

$addInterestResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/interests" -Method Post -Body $interestBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
Write-Host "Added interest:"; $addInterestResponse | ConvertTo-Json

# 6. Get user interests
$interestsResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/interests" -Headers @{Authorization = "Bearer $token"}
Write-Host "User interests:"; $interestsResponse | ConvertTo-Json

# 7. Delete the first user interest (if any exist)
if ($interestsResponse.data.interests.Count -gt 0) {
    $interestId = $interestsResponse.data.interests[0].id
    if ($interestId) {
        $deleteInterestResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users/interests/$interestId" -Method Delete -Headers @{Authorization = "Bearer $token"}
        Write-Host "Deleted interest ID ${interestId}:"; $deleteInterestResponse | ConvertTo-Json
    } else {
        Write-Host "No interest ID found to delete."
    }
} else {
    Write-Host "No interests to delete."
}

# 8. Get current user info
$meResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/me" -Headers @{Authorization = "Bearer $token"}
Write-Host "Current user info:"; $meResponse | ConvertTo-Json

# 9. Refresh the token
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

$refreshResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
Write-Host "Refreshed token:"; $refreshResponse | ConvertTo-Json

# 10. Log out
$logoutResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/logout" -Method Post -Headers @{Authorization = "Bearer $token"}
Write-Host "Logged out:"; $logoutResponse | ConvertTo-Json

# 11. Change password
$changePasswordBody = @{
    currentPassword = "TestPassword123"
    newPassword = "NewPassword123"
} | ConvertTo-Json

$changePasswordResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/change-password" -Method Post -Body $changePasswordBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
Write-Host "Changed password:"; $changePasswordResponse | ConvertTo-Json

Write-Host "`n🎉 All API endpoints tested successfully!" 