# Test Spotify Integration
Write-Host "🎵 Testing Spotify Integration" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Test if server is running
Write-Host "1. Testing server health..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get
    Write-Host "✅ Server is running and healthy" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor White
    Write-Host "   Database: $($response.database)" -ForegroundColor White
} catch {
    Write-Host "❌ Server is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test Spotify credentials by checking environment variables
Write-Host "2. Checking Spotify credentials..." -ForegroundColor Cyan
$envContent = Get-Content .env | Where-Object { $_ -like "SPOTIFY_*" }
foreach ($line in $envContent) {
    if ($line -like "*CLIENT_ID*") {
        $clientId = $line.Split("=")[1]
        if ($clientId -and $clientId -ne "your_spotify_client_id_here") {
            Write-Host "✅ Spotify Client ID is configured" -ForegroundColor Green
        } else {
            Write-Host "❌ Spotify Client ID is not properly configured" -ForegroundColor Red
        }
    }
    if ($line -like "*CLIENT_SECRET*") {
        $clientSecret = $line.Split("=")[1]
        if ($clientSecret -and $clientSecret -ne "your_spotify_client_secret_here") {
            Write-Host "✅ Spotify Client Secret is configured" -ForegroundColor Green
        } else {
            Write-Host "❌ Spotify Client Secret is not properly configured" -ForegroundColor Red
        }
    }
}

Write-Host ""

# Instructions for testing
Write-Host "3. Next steps:" -ForegroundColor Cyan
Write-Host "   - Make sure your frontend is running on http://localhost:3000" -ForegroundColor White
Write-Host "   - Log in to your app" -ForegroundColor White
Write-Host "   - Try clicking the 'Connect Spotify' button" -ForegroundColor White
Write-Host "   - It should now redirect to Spotify's authorization page" -ForegroundColor White

Write-Host ""
Write-Host "🎉 If everything is configured correctly, the Spotify integration should work!" -ForegroundColor Green 