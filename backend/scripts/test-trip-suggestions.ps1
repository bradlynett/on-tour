# Test Trip Suggestion Engine
# This script tests the trip suggestion functionality end-to-end

$baseUrl = "http://localhost:5001/api"
$email = "john.doe@example.com"
$password = "password"

Write-Host "🎯 Testing Trip Suggestion Engine" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Step 1: Login to get token
Write-Host "`n1. Logging in..." -ForegroundColor Yellow
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
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Check user interests
Write-Host "`n2. Checking user interests..." -ForegroundColor Yellow
try {
    $interestsResponse = Invoke-RestMethod -Uri "$baseUrl/users/interests" -Method GET -Headers $headers
    Write-Host "✅ Found $($interestsResponse.data.interests.Count) interests" -ForegroundColor Green
    foreach ($interest in $interestsResponse.data.interests) {
        Write-Host "   - $($interest.interestType): $($interest.interestValue) (Priority: $($interest.priority))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Failed to get interests: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Check travel preferences
Write-Host "`n3. Checking travel preferences..." -ForegroundColor Yellow
try {
    $preferencesResponse = Invoke-RestMethod -Uri "$baseUrl/users/travel-preferences" -Method GET -Headers $headers
    Write-Host "✅ Travel preferences found" -ForegroundColor Green
    $prefs = $preferencesResponse.data.preferences
    Write-Host "   - Primary Airport: $($prefs.primaryAirport)" -ForegroundColor Cyan
    Write-Host "   - Flight Class: $($prefs.flightClass)" -ForegroundColor Cyan
    Write-Host "   - Preferred Airlines: $($prefs.preferredAirlines -join ', ')" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get travel preferences: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Check available events
Write-Host "`n4. Checking available events..." -ForegroundColor Yellow
try {
    $eventsResponse = Invoke-RestMethod -Uri "$baseUrl/events" -Method GET -Headers $headers
    Write-Host "✅ Found $($eventsResponse.data.events.Count) events" -ForegroundColor Green
    foreach ($event in $eventsResponse.data.events[0..2]) {
        Write-Host "   - $($event.name) by $($event.artist) at $($event.venueName), $($event.venueCity)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Failed to get events: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Generate trip suggestions
Write-Host "`n5. Generating trip suggestions..." -ForegroundColor Yellow
try {
    $generateBody = @{
        limit = 3
    } | ConvertTo-Json

    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/trips/generate" -Method POST -Body $generateBody -Headers $headers
    Write-Host "✅ Generated $($generateResponse.data.suggestions.Count) trip suggestions" -ForegroundColor Green
    
    foreach ($suggestion in $generateResponse.data.suggestions) {
        Write-Host "   - Event: $($suggestion.eventName)" -ForegroundColor Cyan
        Write-Host "     Artist: $($suggestion.artist)" -ForegroundColor Cyan
        Write-Host "     Venue: $($suggestion.venueName), $($suggestion.venueCity)" -ForegroundColor Cyan
        Write-Host "     Total Cost: `$$($suggestion.totalCost)" -ForegroundColor Cyan
        Write-Host "     Service Fee: `$$($suggestion.serviceFee)" -ForegroundColor Cyan
        Write-Host "     Status: $($suggestion.status)" -ForegroundColor Cyan
        Write-Host "     Components: $($suggestion.components.Count)" -ForegroundColor Cyan
        
        foreach ($component in $suggestion.components) {
            Write-Host "       * $($component.componentType): $($component.provider) - `$$($component.price)" -ForegroundColor Gray
        }
        Write-Host ""
    }
} catch {
    Write-Host "❌ Failed to generate trip suggestions: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

# Step 6: Get all trip suggestions
Write-Host "`n6. Getting all trip suggestions..." -ForegroundColor Yellow
try {
    $suggestionsResponse = Invoke-RestMethod -Uri "$baseUrl/trips" -Method GET -Headers $headers
    Write-Host "✅ Found $($suggestionsResponse.data.suggestions.Count) total trip suggestions" -ForegroundColor Green
    Write-Host "   Pagination: Page $($suggestionsResponse.data.pagination.page) of $($suggestionsResponse.data.pagination.pages)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get trip suggestions: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Get trip statistics
Write-Host "`n7. Getting trip statistics..." -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/trips/stats/overview" -Method GET -Headers $headers
    $stats = $statsResponse.data.statistics
    Write-Host "✅ Trip Statistics:" -ForegroundColor Green
    Write-Host "   - Total Suggestions: $($stats.totalSuggestions)" -ForegroundColor Cyan
    Write-Host "   - Pending: $($stats.pendingSuggestions)" -ForegroundColor Cyan
    Write-Host "   - Approved: $($stats.approvedSuggestions)" -ForegroundColor Cyan
    Write-Host "   - Booked: $($stats.bookedSuggestions)" -ForegroundColor Cyan
    Write-Host "   - Average Cost: `$$([math]::Round($stats.avgTotalCost, 2))" -ForegroundColor Cyan
    Write-Host "   - Total Spent: `$$([math]::Round($stats.totalSpent, 2))" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get trip statistics: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Test creating a trip suggestion for a specific event
Write-Host "`n8. Testing specific event trip suggestion..." -ForegroundColor Yellow
try {
    # Get first event
    $eventsResponse = Invoke-RestMethod -Uri "$baseUrl/events" -Method GET -Headers $headers
    if ($eventsResponse.data.events.Count -gt 0) {
        $firstEvent = $eventsResponse.data.events[0]
        Write-Host "   Creating suggestion for: $($firstEvent.name)" -ForegroundColor Cyan
        
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/trips/event/$($firstEvent.id)" -Method POST -Headers $headers
        Write-Host "✅ Created trip suggestion for specific event" -ForegroundColor Green
        Write-Host "   - Total Cost: `$$($createResponse.data.suggestion.totalCost)" -ForegroundColor Cyan
        Write-Host "   - Components: $($createResponse.data.suggestion.components.Count)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  No events available to test with" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to create specific event trip suggestion: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Test status update (if we have suggestions)
Write-Host "`n9. Testing status update..." -ForegroundColor Yellow
try {
    $suggestionsResponse = Invoke-RestMethod -Uri "$baseUrl/trips" -Method GET -Headers $headers
    if ($suggestionsResponse.data.suggestions.Count -gt 0) {
        $firstSuggestion = $suggestionsResponse.data.suggestions[0]
        Write-Host "   Updating suggestion $($firstSuggestion.id) status to 'approved'" -ForegroundColor Cyan
        
        $updateBody = @{
            status = "approved"
        } | ConvertTo-Json

        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/trips/$($firstSuggestion.id)/status" -Method PATCH -Body $updateBody -Headers $headers
        Write-Host "✅ Status updated successfully" -ForegroundColor Green
        Write-Host "   - New Status: $($updateResponse.data.suggestion.status)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  No suggestions available to test status update" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to update status: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Trip Suggestion Engine Test Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green 