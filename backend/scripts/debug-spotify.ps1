# Debug Spotify Integration
Write-Host "🔍 Debugging Spotify Integration" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# 1. Check if backend is running
Write-Host "1. Checking backend server..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get
    Write-Host "✅ Backend is running and healthy" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host "   Database: $($healthResponse.database)" -ForegroundColor White
} catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Check if frontend is running
Write-Host "2. Checking frontend server..." -ForegroundColor Cyan
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 5
    Write-Host "✅ Frontend is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend is not running on port 3000" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please start the frontend with: cd frontend; npm start" -ForegroundColor Yellow
}

Write-Host ""

# 3. Test Spotify endpoint without auth (should fail)
Write-Host "3. Testing Spotify endpoint without authentication..." -ForegroundColor Cyan
try {
    $spotifyResponse = Invoke-WebRequest -Uri "http://localhost:5001/api/spotify/login" -Method Get -TimeoutSec 5
    Write-Host "❌ Spotify endpoint should require authentication but didn't" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Spotify endpoint correctly requires authentication" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error from Spotify endpoint" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# 4. Instructions for testing
Write-Host "4. Next steps to test:" -ForegroundColor Cyan
Write-Host "   a) Make sure you're logged in to the app" -ForegroundColor White
Write-Host "   b) Check browser console (F12) for any errors" -ForegroundColor White
Write-Host "   c) Try clicking Connect Spotify button" -ForegroundColor White
Write-Host "   d) If it fails, check the network tab in browser dev tools" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Common issues and solutions:" -ForegroundColor Yellow
Write-Host "   - If you see '401 Unauthorized': You need to log in first" -ForegroundColor White
Write-Host "   - If you see '500 Internal Server Error': Check backend logs" -ForegroundColor White
Write-Host "   - If you see 'Network Error': Frontend can't reach backend" -ForegroundColor White
Write-Host "   - If you see 'CORS Error': Backend CORS configuration issue" -ForegroundColor White

Write-Host ""
Write-Host "📝 To test with a valid token:" -ForegroundColor Cyan
Write-Host "   1. Log in to your app in the browser" -ForegroundColor White
Write-Host "   2. Open browser dev tools (F12)" -ForegroundColor White
Write-Host "   3. Go to Application tab → Local Storage" -ForegroundColor White
Write-Host "   4. Copy the 'token' value" -ForegroundColor White
Write-Host "   5. Use it to test the endpoint manually" -ForegroundColor White 