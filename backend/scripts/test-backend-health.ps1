# Backend Health Test Script
# This script runs health checks to verify the backend is working

Write-Host "🏥 Running Backend Health Tests..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# We're already in the backend directory, no need to change

# Run the health test script
try {
    node scripts/test-backend-health.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All health tests passed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Some health tests failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running health tests: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=====================================" -ForegroundColor Green 