# Quick Endpoint Test Script
Write-Host "Running Quick Endpoint Test..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Run the quick test script
try {
    node scripts/quick-test.js
} catch {
    Write-Host "Error running quick test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=====================================" -ForegroundColor Green