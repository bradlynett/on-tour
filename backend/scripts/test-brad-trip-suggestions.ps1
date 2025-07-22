# Test Trip Suggestions for Brad@lynett.com
# This script generates trip suggestions for the specific user

$baseUrl = "http://localhost:5001/api"
$email = "brad@lynett.com"
$password = "password"

Write-Host "🎯 Testing Trip Suggestions for Brad@lynett.com" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

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

# Step 2: Check user interests
Write-Host "`n2. Checking Brad's interests..." -ForegroundColor Yellow
try {
    $interestsResponse = Invoke-RestMethod -Uri "$baseUrl/users/interests" -Method GET -Headers $headers
    $interests = $interestsResponse.data.interests
    Write-Host "✅ Found $($interests.Count) interests" -ForegroundColor Green
    foreach ($interest in $interests) {
        Write-Host "   - $($interest.interestType): $($interest.interestValue) (Priority: $($interest.priority))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Failed to get interests: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Brad may not have any interests saved yet" -ForegroundColor Yellow
}

# Step 3: Check travel preferences
Write-Host "`n3. Checking Brad's travel preferences..." -ForegroundColor Yellow
try {
    $preferencesResponse = Invoke-RestMethod -Uri "$baseUrl/users/travel-preferences" -Method GET -Headers $headers
    Write-Host "✅ Travel preferences found" -ForegroundColor Green
    $prefs = $preferencesResponse.data.preferences
    Write-Host "   - Primary Airport: $($prefs.primaryAirport)" -ForegroundColor Cyan
    Write-Host "   - Flight Class: $($prefs.flightClass)" -ForegroundColor Cyan
    Write-Host "   - Preferred Airlines: $($prefs.preferredAirlines -join ', ')" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get travel preferences: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Brad may not have travel preferences set up" -ForegroundColor Yellow
}

# Step 4: Check available events that match Brad's interests
Write-Host "`n4. Finding events that match Brad's interests..." -ForegroundColor Yellow
try {
    $eventsResponse = Invoke-RestMethod -Uri "$baseUrl/events/search/interests" -Method GET -Headers $headers
    $events = $eventsResponse.data.events
    Write-Host "✅ Found $($events.Count) matching events" -ForegroundColor Green
    foreach ($event in $events[0..2]) {
        Write-Host "   - $($event.name) by $($event.artist) at $($event.venueName), $($event.venueCity)" -ForegroundColor Cyan
        Write-Host "     Date: $($event.eventDate) | Price: $($event.minPrice) - $($event.maxPrice)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to find matching events: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Generate trip suggestions
Write-Host "`n5. Generating trip suggestions..." -ForegroundColor Yellow
try {
    $generateBody = @{
        limit = 3
    } | ConvertTo-Json

    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/trips/generate" -Method POST -Body $generateBody -Headers $headers
    $suggestions = $generateResponse.data.suggestions
    Write-Host "✅ Generated $($suggestions.Count) trip suggestions" -ForegroundColor Green
    
    foreach ($suggestion in $suggestions) {
        Write-Host "`n🎵 Trip Suggestion #$($suggestion.id):" -ForegroundColor Yellow
        Write-Host "   Event: $($suggestion.eventName) by $($suggestion.artist)" -ForegroundColor White
        Write-Host "   Venue: $($suggestion.venueName), $($suggestion.venueCity), $($suggestion.venueState)" -ForegroundColor White
        Write-Host "   Date: $($suggestion.eventDate)" -ForegroundColor White
        Write-Host "   Total Cost: $($suggestion.totalCost)" -ForegroundColor Green
        Write-Host "   Status: $($suggestion.status)" -ForegroundColor Cyan
        
        if ($suggestion.components) {
            Write-Host "   Components:" -ForegroundColor Gray
            foreach ($component in $suggestion.components) {
                Write-Host "     - $($component.componentType): $($component.provider) ($$($component.price))" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Failed to generate trip suggestions: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Message -like "*No matching events found*") {
        Write-Host "💡 Brad needs to add more interests or there are no matching events" -ForegroundColor Yellow
    }
}

# Step 6: Get all existing trip suggestions
Write-Host "`n6. Getting all existing trip suggestions..." -ForegroundColor Yellow
try {
    $existingResponse = Invoke-RestMethod -Uri "$baseUrl/trips" -Method GET -Headers $headers
    $existingSuggestions = $existingResponse.data.suggestions
    Write-Host "✅ Found $($existingSuggestions.Count) existing trip suggestions" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get existing suggestions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Trip suggestion generation complete!" -ForegroundColor Green
Write-Host "💡 Check the frontend at http://localhost:3000 to see the suggestions" -ForegroundColor Cyan 