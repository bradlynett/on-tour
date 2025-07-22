# Phase 2 Feature Test Script
# Tests trip customization, booking, and payment functionality

Write-Host "🚀 Starting Phase 2 Feature Tests..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if backend is running
Write-Host "📡 Checking if backend is running..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend is running and healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not running. Please start the backend first." -ForegroundColor Red
    Write-Host "   Run: npm start" -ForegroundColor Yellow
    exit 1
}

# Check if required environment variables are set
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow

$requiredEnvVars = @(
    "JWT_SECRET",
    "DB_HOST", 
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD"
)

$missingVars = @()
foreach ($var in $requiredEnvVars) {
    if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "⚠️  Missing environment variables: $($missingVars -join ', ')" -ForegroundColor Yellow
    Write-Host "   Some tests may fail without proper configuration" -ForegroundColor Yellow
} else {
    Write-Host "✅ Environment variables configured" -ForegroundColor Green
}

# Check Stripe configuration
$stripeVars = @("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")
$stripeConfigured = $true
foreach ($var in $stripeVars) {
    if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
        $stripeConfigured = $false
        break
    }
}

if ($stripeConfigured) {
    Write-Host "✅ Stripe payment processing configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Stripe not configured - payment tests will be skipped" -ForegroundColor Yellow
}

# Run the test script
Write-Host "🧪 Running Phase 2 feature tests..." -ForegroundColor Yellow
Write-Host ""

try {
    $testResult = node scripts/test-phase2-features.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Phase 2 tests completed successfully!" -ForegroundColor Green
        Write-Host "   All core booking and payment features are working" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Phase 2 tests completed with some issues" -ForegroundColor Yellow
        Write-Host "   Check the output above for details" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ Phase 2 tests failed to run" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Test Summary:" -ForegroundColor Cyan
Write-Host "   - Trip customization and bundling" -ForegroundColor White
Write-Host "   - Booking creation and management" -ForegroundColor White
Write-Host "   - Payment intent creation (if Stripe configured)" -ForegroundColor White
Write-Host "   - Enhanced travel search (multi-city, packages)" -ForegroundColor White
Write-Host "   - Booking statistics and analytics" -ForegroundColor White

Write-Host ""
Write-Host "🔗 Next Steps:" -ForegroundColor Cyan
Write-Host "   - Test the frontend integration" -ForegroundColor White
Write-Host "   - Configure Stripe for payment processing" -ForegroundColor White
Write-Host "   - Set up webhook endpoints" -ForegroundColor White
Write-Host "   - Proceed to Phase 3: Advanced Features" -ForegroundColor White

Write-Host ""
Write-Host "✅ Phase 2 testing complete!" -ForegroundColor Green 