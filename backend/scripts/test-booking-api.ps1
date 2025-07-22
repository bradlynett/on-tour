# Test Booking API Endpoints
Write-Host "🧳 Testing Booking API Endpoints..." -ForegroundColor Yellow

# Test 1: Login to get token
Write-Host "`n1. Logging in..." -ForegroundColor Cyan
$loginBody = @{
    email = "brad@lynett.com"
    password = "TestPassword1"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Set headers for authenticated requests
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 2: Get available events first
Write-Host "`n2. Getting available events..." -ForegroundColor Cyan
try {
    $eventsResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/events" -Method GET -Headers $headers
    Write-Host "✅ Events retrieved" -ForegroundColor Green
    Write-Host "   Number of events: $($eventsResponse.data.Count)" -ForegroundColor Gray
    
    if ($eventsResponse.data.Count -eq 0) {
        Write-Host "❌ No events found. Cannot test booking without events." -ForegroundColor Red
        exit 1
    }
    
    $firstEvent = $eventsResponse.data | Select-Object -First 1
    $eventId = $firstEvent.id
    Write-Host "   Using event ID: $eventId" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get events: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Test trip customization
Write-Host "`n3. Testing trip customization..." -ForegroundColor Cyan
$customizeBody = @{
    dateFlexibility = 2
    preferences = @{
        flightClass = "economy"
        hotelTier = "standard"
        includeCar = $true
        budget = 1000
    }
} | ConvertTo-Json

try {
    $customizeResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/booking/customize/$eventId" -Method POST -Body $customizeBody -Headers $headers
    Write-Host "✅ Trip customization successful" -ForegroundColor Green
    Write-Host "   Date options: $($customizeResponse.data.dateOptions.Count)" -ForegroundColor Gray
    Write-Host "   Flight options: $($customizeResponse.data.flightOptions.economy.Count) economy" -ForegroundColor Gray
    Write-Host "   Hotel options: $($customizeResponse.data.hotelOptions.standard.Count) standard" -ForegroundColor Gray
    Write-Host "   Bundles: $($customizeResponse.data.bundles.Count)" -ForegroundColor Gray
    
    $customizationData = $customizeResponse.data
} catch {
    Write-Host "❌ Trip customization failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 4: Create a booking
Write-Host "`n4. Creating a booking..." -ForegroundColor Cyan

# Select components from the first bundle
$selectedComponents = @{}
if ($customizationData.bundles.Count -gt 0) {
    $bundle = $customizationData.bundles[0]
    $selectedComponents.flight = $bundle.components.flight
    $selectedComponents.hotel = $bundle.components.hotel
    $selectedComponents.car = $bundle.components.car
    $selectedComponents.ticket = $bundle.components.ticket
}

$createBookingBody = @{
    eventId = $eventId
    selectedComponents = $selectedComponents
    preferences = @{
        startDate = $customizationData.dateOptions[0].date
        endDate = (Get-Date $customizationData.dateOptions[0].date).AddDays(2).ToString("yyyy-MM-dd")
    }
} | ConvertTo-Json -Depth 10

try {
    $bookingResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/booking/create" -Method POST -Body $createBookingBody -Headers $headers
    Write-Host "✅ Booking created successfully" -ForegroundColor Green
    Write-Host "   Booking ID: $($bookingResponse.data.tripPlanId)" -ForegroundColor Gray
    Write-Host "   Total Cost: $($bookingResponse.data.totalCost)" -ForegroundColor Gray
    Write-Host "   Service Fee: $($bookingResponse.data.serviceFee)" -ForegroundColor Gray
    Write-Host "   Grand Total: $($bookingResponse.data.grandTotal)" -ForegroundColor Gray
    $bookingId = $bookingResponse.data.tripPlanId
} catch {
    Write-Host "❌ Booking creation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 5: Get user bookings
Write-Host "`n5. Getting user bookings..." -ForegroundColor Cyan
try {
    $bookingsResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/booking" -Method GET -Headers $headers
    Write-Host "✅ User bookings retrieved" -ForegroundColor Green
    Write-Host "   Number of bookings: $($bookingsResponse.data.Count)" -ForegroundColor Gray
    foreach ($booking in $bookingsResponse.data) {
        Write-Host "   - Booking $($booking.id): $($booking.event_name) - $($booking.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Get user bookings failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get specific booking
Write-Host "`n6. Getting specific booking..." -ForegroundColor Cyan
try {
    $specificBookingResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/booking/$bookingId" -Method GET -Headers $headers
    Write-Host "✅ Specific booking retrieved" -ForegroundColor Green
    Write-Host "   Booking ID: $($specificBookingResponse.data.id)" -ForegroundColor Gray
    Write-Host "   Status: $($specificBookingResponse.data.status)" -ForegroundColor Gray
    Write-Host "   Total Cost: $($specificBookingResponse.data.total_cost)" -ForegroundColor Gray
    Write-Host "   Event: $($specificBookingResponse.data.event_name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Get specific booking failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Booking API tests completed!" -ForegroundColor Green 