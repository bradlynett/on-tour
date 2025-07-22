# Check Environment Variables
Write-Host "🔍 Checking Environment Variables..." -ForegroundColor Yellow

# Check if .env file exists
$envPath = Join-Path (Get-Location) ".env"
Write-Host "`n1. Checking .env file..." -ForegroundColor Cyan
Write-Host "   Looking for .env at: $envPath" -ForegroundColor Gray
Write-Host "   .env file exists: $(Test-Path $envPath)" -ForegroundColor Gray

if (Test-Path $envPath) {
    Write-Host "   .env file found! Contents:" -ForegroundColor Green
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^(AMADEUS_|SPOTIFY_|JWT_|DB_)") {
            Write-Host "     $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ❌ .env file not found!" -ForegroundColor Red
}

# Check environment variables
Write-Host "`n2. Checking Environment Variables..." -ForegroundColor Cyan
$envVars = @(
    "AMADEUS_CLIENT_ID",
    "AMADEUS_CLIENT_SECRET", 
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "JWT_SECRET",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD"
)

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host ("   ✅ {0}: {1}..." -f $var, $value.Substring(0, [Math]::Min(10, $value.Length))) -ForegroundColor Green
    } else {
        Write-Host ("   ❌ {0}: Missing" -f $var) -ForegroundColor Red
    }
}

# Test backend environment check endpoint
Write-Host "`n3. Testing backend environment..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔍 Environment check complete!" -ForegroundColor Yellow 