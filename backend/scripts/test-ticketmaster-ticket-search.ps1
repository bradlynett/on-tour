# Test Ticketmaster Ticket Search via API
# Update these variables with your credentials and event details

$baseUrl = "http://localhost:5001/api"
$email = "brad@lynett.com"      # <-- UPDATE
$password = "TestPassword1"    # <-- UPDATE
$eventId = "1D00611CAB754EDB"
$uri = "$baseUrl/ticketing/search?eventId=$eventId&maxResults=5"
$maxResults = 5

Write-Host "🎯 Testing Ticketmaster Ticket Search" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

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

# Step 2: Search for tickets
Write-Host "`n2. Searching for Ticketmaster tickets..." -ForegroundColor Yellow
$uri = "$baseUrl/ticketing/search?eventName=$($eventName -replace ' ', '%20')&venueName=$($venueName -replace ' ', '%20')&eventDate=$eventDate&maxResults=$maxResults"

try {
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET
    Write-Host "✅ Ticket search successful!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "❌ Ticket search failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
} 