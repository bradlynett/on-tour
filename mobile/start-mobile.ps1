# Start Mobile Development Server
Write-Host "🎵 Starting Concert Travel Mobile App..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host "📱 Mobile App Setup Instructions:" -ForegroundColor Yellow
Write-Host "1. Install Expo Go on your device:" -ForegroundColor White
Write-Host "   - iOS: Search 'Expo Go' in App Store" -ForegroundColor Gray
Write-Host "   - Android: Search 'Expo Go' in Google Play" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Make sure your phone and computer are on the same WiFi network" -ForegroundColor White
Write-Host ""
Write-Host "3. Scan the QR code that appears in your browser" -ForegroundColor White
Write-Host ""
Write-Host "4. Test login with your backend credentials" -ForegroundColor White
Write-Host ""
Write-Host "🔧 API Configuration:" -ForegroundColor Yellow
Write-Host "   Backend URL: http://172.20.10.2:5001/api" -ForegroundColor Gray
Write-Host "   (Using your local network IP for device testing)" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan

# Start Expo development server
Write-Host "🚀 Starting Expo development server..." -ForegroundColor Green
npx expo start 