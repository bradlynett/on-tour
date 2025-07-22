# Enhanced Trip Suggestion Engine Test Script
param(
    [switch]$All,
    [string]$Test = "all"
)

# Load environment variables
Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}

Write-Host "Enhanced Trip Suggestion Engine Test Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check environment variables
Write-Host "Checking environment variables..." -ForegroundColor Yellow
$requiredVars = @("SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET")
$optionalVars = @("LASTFM_API_KEY")

$allFound = $true
foreach ($var in $requiredVars) {
    if ([Environment]::GetEnvironmentVariable($var)) {
        Write-Host "✅ Required variable found: $var" -ForegroundColor Green
    } else {
        Write-Host "❌ Required variable missing: $var" -ForegroundColor Red
        $allFound = $false
    }
}

foreach ($var in $optionalVars) {
    if ([Environment]::GetEnvironmentVariable($var)) {
        Write-Host "✅ Optional variable found: $var" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Optional variable missing: $var" -ForegroundColor Yellow
    }
}

if (-not $allFound) {
    Write-Host "❌ Missing required environment variables. Please check your .env file." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Test Configuration:" -ForegroundColor Cyan
Write-Host "  Test Type: $Test" -ForegroundColor White
Write-Host "  Run All: $All" -ForegroundColor White
Write-Host ""

# Confirm before running
$confirmation = Read-Host "Do you want to proceed with the enhanced trip engine test? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Test cancelled by user." -ForegroundColor Yellow
    exit 0
}

Write-Host "Starting enhanced trip engine test..." -ForegroundColor Green

# Run the test
$command = "node test-enhanced-trip-engine.js"
Write-Host "Command: $command" -ForegroundColor Gray

try {
    & node test-enhanced-trip-engine.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Enhanced trip engine test completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Enhanced trip engine test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to run enhanced trip engine test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Enhanced trip engine test completed" -ForegroundColor Cyan 