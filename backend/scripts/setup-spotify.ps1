# Spotify Setup Script for Concert Travel App
Write-Host "🎵 Spotify Integration Setup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "To fix the 'Missing required parameter; client_id' error, you need to:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to https://developer.spotify.com/dashboard" -ForegroundColor Cyan
Write-Host "2. Log in with your Spotify account" -ForegroundColor Cyan
Write-Host "3. Click 'Create App'" -ForegroundColor Cyan
Write-Host "4. Fill in the app details:" -ForegroundColor Cyan
Write-Host "   - App name: Concert Travel App" -ForegroundColor White
Write-Host "   - App description: Concert travel app integration" -ForegroundColor White
Write-Host "   - Website: http://localhost:3000" -ForegroundColor White
Write-Host "   - Redirect URIs: http://127.0.0.1:3000/spotify" -ForegroundColor White
Write-Host "5. Click 'Save'" -ForegroundColor Cyan
Write-Host "6. Copy your Client ID and Client Secret" -ForegroundColor Cyan
Write-Host ""

Write-Host "Then set the environment variables:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1 - Set for current session:" -ForegroundColor Cyan
Write-Host '$env:SPOTIFY_CLIENT_ID="your_client_id_here"' -ForegroundColor White
Write-Host '$env:SPOTIFY_CLIENT_SECRET="your_client_secret_here"' -ForegroundColor White
Write-Host ""

Write-Host "Option 2 - Create a .env file in the backend directory:" -ForegroundColor Cyan
Write-Host "Create a file named '.env' with these contents:" -ForegroundColor White
Write-Host ""
Write-Host "SPOTIFY_CLIENT_ID=your_client_id_here" -ForegroundColor Gray
Write-Host "SPOTIFY_CLIENT_SECRET=your_client_secret_here" -ForegroundColor Gray
Write-Host "SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify" -ForegroundColor Gray
Write-Host ""

Write-Host "After setting the credentials, restart your backend server:" -ForegroundColor Yellow
Write-Host "npx nodemon server.js" -ForegroundColor White
Write-Host ""

Write-Host "The Spotify Connect buttons should then work properly!" -ForegroundColor Green 