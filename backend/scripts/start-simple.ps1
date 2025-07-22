# Simple Concert Travel App Startup Script
Write-Host "🎵 Concert Travel App - Simple Startup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Kill existing Node.js processes
Write-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Stopped existing Node.js processes" -ForegroundColor Green

# Start backend
Write-Host ""
Write-Host "🚀 Starting Backend..." -ForegroundColor Green
Set-Location "concert-travel-app\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Wait a moment
Start-Sleep -Seconds 5

# Start frontend
Write-Host ""
Write-Host "🚀 Starting Frontend..." -ForegroundColor Green
Set-Location "..\.."
Set-Location "concert-travel-app\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"

Write-Host ""
Write-Host "🎉 Both servers started!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Login credentials:" -ForegroundColor Yellow
Write-Host "   Email: john.doe@example.com" -ForegroundColor White
Write-Host "   Password: password" -ForegroundColor White 