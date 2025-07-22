# Generate Trip Suggestions for Existing User
# This script logs in with john.doe@example.com, adds interests, and generates trip suggestions

$baseUrl = "http://localhost:5001/api"

Write-Host "Generating Trip Suggestions" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Step 1: Login with existing user
Write-Host "`n1. Logging in with john.doe@example.com..." -ForegroundColor Yellow
$loginBody = @{
    email = "john.doe@example.com"
    password = "password"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   User ID: $($loginResponse.data.user.id)" -ForegroundColor Cyan
    Write-Host "   Token received: $($token.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Add travel preferences
Write-Host "`n2. Adding travel preferences..." -ForegroundColor Yellow
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
    Write-Host "💡 Preferences may already exist" -ForegroundColor Yellow
}

# Step 3: Add user interests
Write-Host "`n3. Adding user interests..." -ForegroundColor Yellow

$interests = @(
    @{
        type = "artist"
        value = "Taylor Swift"
        priority = 1
    },
    @{
        type = "venue"
        value = "Madison Square Garden"
        priority = 2
    },
    @{
        type = "city"
        value = "New York"
        priority = 3
    },
    @{
        type = "artist"
        value = "Ed Sheeran"
        priority = 4
    }
)

foreach ($interest in $interests) {
    try {
        $interestBody = $interest | ConvertTo-Json
        $interestResponse = Invoke-RestMethod -Uri "$baseUrl/users/interests" -Method POST -Body $interestBody -Headers $headers
        Write-Host "✅ Added interest: $($interest.type) - $($interest.value)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to add interest $($interest.type) - $($interest.value): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 4: Generate trip suggestions
Write-Host "`n4. Generating trip suggestions..." -ForegroundColor Yellow

try {
    $suggestionsResponse = Invoke-RestMethod -Uri "$baseUrl/trips/suggestions" -Method GET -Headers $headers
    Write-Host "✅ Trip suggestions generated successfully!" -ForegroundColor Green
    Write-Host "   Number of suggestions: $($suggestionsResponse.data.suggestions.Count)" -ForegroundColor Cyan
    
    if ($suggestionsResponse.data.suggestions.Count -gt 0) {
        Write-Host "`nTrip Suggestions Preview:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $suggestionsResponse.data.suggestions.Count); $i++) {
            $suggestion = $suggestionsResponse.data.suggestions[$i]
            Write-Host "   $($i + 1). $($suggestion.event.artist) at $($suggestion.event.venue)" -ForegroundColor White
            Write-Host "      Date: $($suggestion.event.date)" -ForegroundColor Gray
            Write-Host "      Total Cost: $($suggestion.total_cost)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No trip suggestions found. This might be due to:" -ForegroundColor Yellow
        Write-Host "   - No matching events in the database" -ForegroundColor Gray
        Write-Host "   - No events in the near future" -ForegroundColor Gray
        Write-Host "   - No available travel options" -ForegroundColor Gray
    }
    
    # Save suggestions to file for review
    $suggestionsResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "trip-suggestions-output.json" -Encoding UTF8
    Write-Host "`nFull suggestions saved to: trip-suggestions-output.json" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Failed to generate trip suggestions: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nTrip suggestion generation complete!" -ForegroundColor Green 