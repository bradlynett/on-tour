# Concert Travel App Master Startup Script
Write-Host "🎵 Concert Travel App" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "Complete Application Startup" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "concert-travel-app")) {
    Write-Host "❌ Please run this script from the Concert Travel App root directory" -ForegroundColor Red
    Write-Host "💡 Current directory: $PWD" -ForegroundColor Yellow
    exit 1
}

# Kill any existing Node.js processes
Write-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Stopped existing Node.js processes" -ForegroundColor Green

# Check if Docker is running
Write-Host "🔍 Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "💡 After starting Docker, run this script again." -ForegroundColor Yellow
    exit 1
}

# Start backend
Write-Host ""
Write-Host "🚀 Starting Backend..." -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

Set-Location "concert-travel-app\backend"

# Check if start-backend.ps1 exists
if (Test-Path ".\scripts\start-backend.ps1") {
    Write-Host "📦 Using backend startup script..." -ForegroundColor Yellow
    & ".\scripts\start-backend.ps1"
} else {
    # Fallback: start backend directly
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
    
    Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
}

# Wait for backend to be ready
Write-Host ""
Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Find backend port
$backendPort = $null
for ($port = 5001; $port -le 5010; $port++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 3 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $backendPort = $port
            break
        }
    } catch {
        continue
    }
}

if (-not $backendPort) {
    Write-Host "❌ Backend is not responding on any port" -ForegroundColor Red
    Write-Host "💡 Check if the backend started successfully" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Backend is running on port $backendPort" -ForegroundColor Green

# Start frontend
Write-Host ""
Write-Host "🚀 Starting Frontend..." -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

# Go back to root directory
Set-Location "..\.."

# Start frontend in new window
$frontendScript = "concert-travel-app\frontend\scripts\start-frontend.ps1"
if (Test-Path $frontendScript) {
    Write-Host "📱 Opening frontend in new window..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\concert-travel-app\frontend'; .\scripts\start-frontend.ps1"
} else {
    Write-Host "📱 Starting frontend..." -ForegroundColor Yellow
    Set-Location "concert-travel-app\frontend"
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
}

Write-Host ""
Write-Host "🎉 Application startup complete!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "📊 Health Check: http://localhost:$backendPort/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Login credentials:" -ForegroundColor Yellow
Write-Host "   Email: john.doe@example.com" -ForegroundColor White
Write-Host "   Password: password" -ForegroundColor White
Write-Host ""
Write-Host "🔍 To check if everything is working:" -ForegroundColor Yellow
Write-Host "   Backend health: http://localhost:$backendPort/health" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White 