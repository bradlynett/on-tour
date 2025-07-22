# Concert Travel App - Event Scraping Test Script
# This script tests the event scraping functionality
# Run from the backend directory: .\scripts\test-event-scraping.ps1

Write-Host "🎫 Testing Event Scraping System" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# 1. First, we need to get a valid token by logging in
Write-Host "`n1. Logging in to get authentication token..." -ForegroundColor Yellow

$loginBody = @{
    email = "john.doe@example.com"
    password = "password"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful. Token obtained." -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed. Please make sure you have a test user registered." -ForegroundColor Red
    Write-Host "You can register a user first using the test-auth.ps1 script." -ForegroundColor Yellow
    exit 1
}

# 2. Test manual event scraping
Write-Host "`n2. Testing manual event scraping..." -ForegroundColor Yellow

$scrapeBody = @{
    providers = @("ticketmaster", "livenation", "stubhub", "vividseats")
} | ConvertTo-Json

try {
    $scrapeResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/events/scrape" -Method Post -Body $scrapeBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
    Write-Host "✅ Scraping initiated successfully:" -ForegroundColor Green
    Write-Host "   Message: $($scrapeResponse.message)" -ForegroundColor White
    Write-Host "   Providers: $($scrapeResponse.providers -join ', ')" -ForegroundColor White
    
    # Wait a bit for scraping to complete
    Write-Host "   Waiting 5 seconds for scraping to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} catch {
    Write-Host "❌ Scraping failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Get scraping statistics
Write-Host "`n3. Getting scraping statistics..." -ForegroundColor Yellow

try {
    $statsResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/events/stats/scraping" -Headers @{Authorization = "Bearer $token"}
    Write-Host "✅ Statistics retrieved successfully:" -ForegroundColor Green
    
    $stats = $statsResponse.data.statistics
    Write-Host "   Total Events: $($stats.total_events)" -ForegroundColor White
    Write-Host "   Upcoming Events: $($stats.upcoming_events)" -ForegroundColor White
    Write-Host "   Past Events: $($stats.past_events)" -ForegroundColor White
    Write-Host "   Average Min Price: $([math]::Round($stats.avg_min_price, 2))" -ForegroundColor White
    Write-Host "   Average Max Price: $([math]::Round($stats.avg_max_price, 2))" -ForegroundColor White
    
    if ($statsResponse.data.providers) {
        Write-Host "   Events by Provider:" -ForegroundColor White
        foreach ($provider in $statsResponse.data.providers) {
            Write-Host "     $($provider.provider): $($provider.count) events" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Failed to get statistics:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Get all events with pagination
Write-Host "`n4. Testing event retrieval with pagination..." -ForegroundColor Yellow

try {
    $eventsResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/events?page=1&limit=5" -Headers @{Authorization = "Bearer $token"}
    Write-Host "✅ Events retrieved successfully:" -ForegroundColor Green
    Write-Host "   Total Events: $($eventsResponse.data.pagination.total)" -ForegroundColor White
    Write-Host "   Current Page: $($eventsResponse.data.pagination.page)" -ForegroundColor White
    Write-Host "   Events per Page: $($eventsResponse.data.pagination.limit)" -ForegroundColor White
    Write-Host "   Total Pages: $($eventsResponse.data.pagination.pages)" -ForegroundColor White
    
    if ($eventsResponse.data.events.Count -gt 0) {
        Write-Host "   Sample Events:" -ForegroundColor White
        foreach ($event in $eventsResponse.data.events[0..2]) {
            Write-Host "     • $($event.artist) at $($event.venue_name) on $($event.event_date)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Failed to retrieve events:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test event filtering
Write-Host "`n5. Testing event filtering..." -ForegroundColor Yellow

try {
    $filterResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/events?artist=Taylor&limit=3" -Headers @{Authorization = "Bearer $token"}
    Write-Host "✅ Event filtering successful:" -ForegroundColor Green
    Write-Host "   Found $($filterResponse.data.events.Count) events matching 'Taylor'" -ForegroundColor White
    
    if ($filterResponse.data.events.Count -gt 0) {
        Write-Host "   Filtered Events:" -ForegroundColor White
        foreach ($event in $filterResponse.data.events) {
            Write-Host "     • $($event.artist) at $($event.venue_name)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Event filtering failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Test interest-based event search
Write-Host "`n6. Testing interest-based event search..." -ForegroundColor Yellow

try {
    $interestResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/events/search/interests?limit=5" -Headers @{Authorization = "Bearer $token"}
    Write-Host "✅ Interest-based search successful:" -ForegroundColor Green
    
    if ($interestResponse.data.message) {
        Write-Host "   Message: $($interestResponse.data.message)" -ForegroundColor White
    } else {
        Write-Host "   Found $($interestResponse.data.events.Count) events matching your interests" -ForegroundColor White
        if ($interestResponse.data.interests) {
            Write-Host "   Your Interests:" -ForegroundColor White
            foreach ($interest in $interestResponse.data.interests) {
                Write-Host "     • $($interest.interest_value) ($($interest.interest_type))" -ForegroundColor White
            }
        }
    }
} catch {
    Write-Host "❌ Interest-based search failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Event Scraping Test Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "The event scraping system is now ready for use!" -ForegroundColor White
Write-Host "You can:" -ForegroundColor Yellow
Write-Host "  • Add interests to your profile to get personalized recommendations" -ForegroundColor White
Write-Host "  • Use the /api/events endpoints to search and filter events" -ForegroundColor White
Write-Host "  • Trigger manual scraping with /api/events/scrape" -ForegroundColor White
Write-Host "  • View statistics with /api/events/stats/scraping" -ForegroundColor White 