# Concert Travel App Frontend Startup Script
Write-Host "🎵 Concert Travel App Frontend Startup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Function to check if backend is running
function Test-BackendHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Function to find backend port
function Find-BackendPort {
    for ($port = 5001; $port -le 5010; $port++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                return $port
            }
        } catch {
            continue
        }
    }
    return $null
}

# Check if backend is running
Write-Host "🔍 Checking backend status..." -ForegroundColor Yellow
$backendPort = Find-BackendPort

if (-not $backendPort) {
    Write-Host "❌ Backend is not running on ports 5001-5010" -ForegroundColor Red
    Write-Host "💡 Please start the backend first by running:" -ForegroundColor Yellow
    Write-Host "   cd ../backend" -ForegroundColor White
    Write-Host "   .\scripts\start-backend.ps1" -ForegroundColor White
    exit 1
}

Write-Host "✅ Backend is running on port $backendPort" -ForegroundColor Green

# Update frontend API configuration if needed
$apiConfigPath = "src\config\api.ts"
if (Test-Path $apiConfigPath) {
    $apiConfig = Get-Content $apiConfigPath -Raw
    if ($apiConfig -notmatch "localhost:$backendPort") {
        Write-Host "📝 Updating API configuration to use port $backendPort..." -ForegroundColor Yellow
        $apiConfig = $apiConfig -replace "localhost:\d+", "localhost:$backendPort"
        Set-Content $apiConfigPath $apiConfig
    }
}

# Kill any existing frontend processes
Write-Host "🛑 Stopping existing frontend processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null

# Clear port 3000
Write-Host "🛑 Clearing port 3000..." -ForegroundColor Yellow
try {
    $processes = netstat -ano | Select-String ":3000\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    }
    foreach ($pid in $processes) {
        if ($pid -and $pid -ne "0") {
            taskkill /F /PID $pid 2>$null
        }
    }
} catch {
    Write-Host "⚠️  Could not clear port 3000" -ForegroundColor Yellow
}

# Start the frontend
Write-Host "🚀 Starting frontend server..." -ForegroundColor Yellow
try {
    npm start
} catch {
    Write-Host "❌ Failed to start frontend server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 