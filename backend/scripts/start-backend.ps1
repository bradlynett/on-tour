# Concert Travel App Backend Startup Script
Write-Host "🎵 Concert Travel App Backend Startup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to kill processes on a specific port
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $processes = netstat -ano | Select-String ":$Port\s" | ForEach-Object {
            ($_ -split '\s+')[-1]
        }
        foreach ($pid in $processes) {
            if ($pid -and $pid -ne "0") {
                Write-Host "🛑 Killing process $pid on port $Port" -ForegroundColor Yellow
                taskkill /F /PID $pid 2>$null
            }
        }
    } catch {
        Write-Host "⚠️  Could not kill processes on port $Port" -ForegroundColor Yellow
    }
}

# Kill any existing Node.js processes
Write-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null

# Kill processes on port 5001
Write-Host "🛑 Clearing port 5001..." -ForegroundColor Yellow
Stop-ProcessOnPort 5001

# Initialize database
Write-Host "📊 Initializing database..." -ForegroundColor Yellow
try {
    & "$PSScriptRoot\init-db.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Database initialization failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Database initialization failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait a moment for database to be fully ready
Start-Sleep -Seconds 3

# Start the backend server
Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
try {
    npm run dev
} catch {
    Write-Host "❌ Failed to start backend server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 