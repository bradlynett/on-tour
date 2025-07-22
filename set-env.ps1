Write-Host "Loading environment variables for running one time updates..." -ForegroundColor Cyan

# Set environment variables (replace with your actual keys)
$env:DB_HOST=localhost
$env:DB_PORT=5433
$env:DB_NAME=concert_travel
$env:DB_USER=postgres
$env:DB_PASSWORD=password
$env:PORT=5001
$env:NODE_ENV=development
$env:REDIS_URL=redis://localhost:6379
$env:SEATGEEK_CLIENT_ID = "NTEzNDk2ODl8MTc1Mjk3OTQ4OS41MzczMTA0"
$env:TICKETMASTER_API_KEY = "r1GAy4ORlEmDBNVEddhl8mcCGGGnU9D3"
$env:SPOTIFY_CLIENT_ID=f7f7055c84664f548560da0bf789c784
$env:SPOTIFY_CLIENT_SECRET=1b0e1e879cb44324a2451f96977f46ba
$env:SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify
$env:TICKETMASTER_API_KEY=r1GAy4ORlEmDBNVEddhl8mcCGGGnU9D3
$env:EVENTBRITE_API_KEY=OKSE5T2HWIXNL4L7WHDL
$env:LASTFM_API_KEY=0f05e53d24ae53a57da4f9906de438a3
$env:AMADEUS_CLIENT_ID=RYx4ikApLctym7lOlg24bdkwsubsAoFQ
$env:AMADEUS_CLIENT_SECRET=raye3DN5LyoJAEh2

# Navigate to backend directory
Set-Location "backend"

# Run the script
#node scripts/regenerate-trip-components.js *>&1 | Tee-Object -FilePath ../regenerate-log.txt

# After regenerating components, fix pricing
#node scripts/fix-trip-suggestion-prices.js *>&1 | Tee-Object -FilePath ../fix-prices-log.txt

Write-Host "\nRunning SeatGeek ticket test script for event 28 and trip_suggestion_id 601..." -ForegroundColor Yellow

node store-seatgeek-tickets.js *>&1 | Tee-Object -FilePath ../seatgeek-ticket-log.txt

Write-Host "One time update complete." -ForegroundColor Green