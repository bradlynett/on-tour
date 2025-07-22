# Test Stripe Integration
Write-Host " Testing Stripe Integration..." -ForegroundColor Cyan

# Configuration
$BASE_URL = "http://localhost:5001"
$EMAIL = "brad@lynett.com"
$PASSWORD = "TestPassword1"

# Colors for output
$SUCCESS_COLOR = "Green"
$ERROR_COLOR = "Red"
$INFO_COLOR = "Yellow"

function Write-Success {
    param([string]$Message)
    Write-Host " $Message" -ForegroundColor $SUCCESS_COLOR
}

function Write-Error {
    param([string]$Message)
    Write-Host " $Message" -ForegroundColor $ERROR_COLOR
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ  $Message" -ForegroundColor $INFO_COLOR
}

try {
    # Step 1: Login
    Write-Info "1. Logging in..."
    $loginBody = @{
        email = $EMAIL
        password = $PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        Write-Success "Login successful"
        Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Error "Login failed: $($loginResponse.message)"
        exit 1
    }

    # Step 2: Get available events
    Write-Info "2. Getting available events..."
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $eventsResponse = Invoke-RestMethod -Uri "$BASE_URL/api/events" -Method GET -Headers $headers
    
    if ($eventsResponse.success -and $eventsResponse.data.Length -gt 0) {
        $eventId = $eventsResponse.data[0].id
        Write-Success "Events retrieved"
        Write-Host "   Number of events: $($eventsResponse.data.Length)" -ForegroundColor Gray
        Write-Host "   Using event ID: $eventId" -ForegroundColor Gray
    } else {
        Write-Error "Failed to get events"
        exit 1
    }

    # Step 3: Create a booking first
    Write-Info "3. Creating a booking..."
    $bookingBody = @{
        eventId = $eventId
        selectedComponents = @{
            flight = @{
                id = "mock_flight_1"
                provider = "mock"
                price = 250.00
                details = @{
                    departureDate = "2024-12-15"
                    returnDate = "2024-12-17"
                    origin = "JFK"
                    destination = "LAX"
                }
            }
            hotel = @{
                id = "mock_hotel_1"
                provider = "mock"
                price = 150.00
                details = @{
                    checkIn = "2024-12-15"
                    checkOut = "2024-12-17"
                    location = "Los Angeles, CA"
                }
            }
            ticket = @{
                id = "mock_ticket_1"
                provider = "mock"
                price = 75.00
                details = @{
                    type = "General Admission"
                }
            }
        }
        preferences = @{}
    } | ConvertTo-Json -Depth 10

    $bookingResponse = Invoke-RestMethod -Uri "$BASE_URL/api/booking/create" -Method POST -Body $bookingBody -Headers $headers -ContentType "application/json"
    
    if ($bookingResponse.success) {
        $bookingId = $bookingResponse.data.tripPlanId
        $totalCost = $bookingResponse.data.grandTotal
        Write-Success "Booking created successfully"
        Write-Host "   Booking ID: $bookingId" -ForegroundColor Gray
        Write-Host "   Total Cost: $totalCost" -ForegroundColor Gray
    } else {
        Write-Error "Failed to create booking: $($bookingResponse.message)"
        exit 1
    }

    # Step 4: Create payment intent
    Write-Info "4. Creating payment intent..."
    $paymentIntentBody = @{
        bookingId = $bookingId
        amount = $totalCost
        currency = "usd"
    } | ConvertTo-Json

    $paymentIntentResponse = Invoke-RestMethod -Uri "$BASE_URL/api/payment/create-intent" -Method POST -Body $paymentIntentBody -Headers $headers -ContentType "application/json"
    
    if ($paymentIntentResponse.success) {
        $paymentIntentId = $paymentIntentResponse.data.paymentIntentId
        $clientSecret = $paymentIntentResponse.data.clientSecret
        $serviceFee = $paymentIntentResponse.data.serviceFee
        Write-Success "Payment intent created successfully"
        Write-Host "   Payment Intent ID: $paymentIntentId" -ForegroundColor Gray
        Write-Host "   Service Fee: $serviceFee" -ForegroundColor Gray
        Write-Host "   Client Secret: $($clientSecret.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Error "Failed to create payment intent: $($paymentIntentResponse.message)"
        exit 1
    }

    # Step 5: Test payment methods endpoint
    Write-Info "5. Testing payment methods endpoint..."
    $paymentMethodsResponse = Invoke-RestMethod -Uri "$BASE_URL/api/payment/payment-methods" -Method GET -Headers $headers
    
    if ($paymentMethodsResponse.success) {
        Write-Success "Payment methods retrieved"
        Write-Host "   Number of payment methods: $($paymentMethodsResponse.data.Length)" -ForegroundColor Gray
    } else {
        Write-Error "Failed to get payment methods: $($paymentMethodsResponse.message)"
    }

    # Step 6: Test payment history
    Write-Info "6. Testing payment history..."
    $paymentHistoryResponse = Invoke-RestMethod -Uri "$BASE_URL/api/payment/history" -Method GET -Headers $headers
    
    if ($paymentHistoryResponse.success) {
        Write-Success "Payment history retrieved"
        Write-Host "   Number of payments: $($paymentHistoryResponse.data.Length)" -ForegroundColor Gray
    } else {
        Write-Error "Failed to get payment history: $($paymentHistoryResponse.message)"
    }

    # Step 7: Test refund endpoint (this will fail since payment isn't confirmed, but tests the endpoint)
    Write-Info "7. Testing refund endpoint (expected to fail without confirmed payment)..."
    $refundBody = @{
        bookingId = $bookingId
        refundAmount = 100.00
        reason = "Test refund"
    } | ConvertTo-Json

    try {
        $refundResponse = Invoke-RestMethod -Uri "$BASE_URL/api/payment/refund" -Method POST -Body $refundBody -Headers $headers -ContentType "application/json"
        Write-Success "Refund processed successfully"
        Write-Host "   Refund Amount: $($refundResponse.data.amount)" -ForegroundColor Gray
    } catch {
        Write-Info "Refund failed as expected (payment not confirmed): $($_.Exception.Message)"
    }

    Write-Host "`n Stripe Integration Tests Completed!" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Set up Stripe webhook endpoint for payment confirmations" -ForegroundColor White
    Write-Host "2. Test with real Stripe test cards" -ForegroundColor White
    Write-Host "3. Implement frontend payment form" -ForegroundColor White
    Write-Host "4. Add payment confirmation flow" -ForegroundColor White

} catch {
    Write-Error "Test failed: $($_.Exception.Message)"
    Write-Host "Full error: $($_.Exception)" -ForegroundColor Red
    exit 1
}
