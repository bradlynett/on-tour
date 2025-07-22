# Test Ticketing Providers Integration
# This script tests the new ticketing providers (StubHub, Vivid Seats, AXS) integration

param(
    [string]$ServerUrl = "http://localhost:5001",
    [switch]$Verbose
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"
$White = "White"

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor $Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️ $Message" -ForegroundColor $Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n🔧 $Message" -ForegroundColor $White
}

# Check if Node.js is available
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Node.js found: $nodeVersion"
            return $true
        }
    } catch {
        Write-Error "Node.js not found or not in PATH"
        return $false
    }
    return $false
}

# Check if server is running
function Test-Server {
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/health" -Method GET -TimeoutSec 10
        if ($response.status -eq "healthy") {
            Write-Success "Server is healthy at $ServerUrl"
            return $true
        } else {
            Write-Warning "Server responded but status is: $($response.status)"
            return $false
        }
    } catch {
        Write-Error "Server not responding at $ServerUrl"
        Write-Info "Make sure the server is running with: npm start"
        return $false
    }
}

# Run the test script
function Test-TicketingProviders {
    Write-Step "Testing Ticketing Providers Integration"
    
    $testScript = "scripts/test-ticketing-providers.js"
    
    if (-not (Test-Path $testScript)) {
        Write-Error "Test script not found: $testScript"
        return $false
    }
    
    try {
        Write-Info "Running ticketing providers test..."
        
        if ($Verbose) {
            node $testScript
        } else {
            $output = node $testScript 2>&1
            $output | ForEach-Object {
                if ($_ -match "✅|❌|⚠️|ℹ️|🔧|🎵|🏥|📋|🎫|💰|🔥|📊|🎉") {
                    Write-Host $_
                } elseif ($Verbose) {
                    Write-Host $_
                }
            }
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Ticketing providers test completed successfully"
            return $true
        } else {
            Write-Error "Ticketing providers test failed with exit code: $LASTEXITCODE"
            return $false
        }
        
    } catch {
        Write-Error "Error running ticketing providers test: $($_.Exception.Message)"
        return $false
    }
}

# Main execution
function Main {
    Write-Host "🎵 Concert Travel App - Ticketing Providers Test" -ForegroundColor $Cyan
    Write-Host "=================================================" -ForegroundColor $Cyan
    
    # Check prerequisites
    Write-Step "Checking prerequisites..."
    
    if (-not (Test-NodeJS)) {
        Write-Error "Node.js is required but not found"
        exit 1
    }
    
    if (-not (Test-Server)) {
        Write-Error "Server is not running or not healthy"
        Write-Info "Please start the server first:"
        Write-Info "  cd backend"
        Write-Info "  npm start"
        exit 1
    }
    
    # Run tests
    Write-Step "Running ticketing providers integration tests..."
    
    $success = Test-TicketingProviders
    
    if ($success) {
        Write-Success "All ticketing providers tests completed successfully!"
        Write-Info "The new ticketing providers (StubHub, Vivid Seats, AXS) are now integrated"
        Write-Info "You can test the API endpoints:"
        Write-Info "  GET $ServerUrl/api/ticketing/providers"
        Write-Info "  GET $ServerUrl/api/ticketing/health"
        Write-Info "  GET $ServerUrl/api/ticketing/search?eventName=concert"
    } else {
        Write-Error "Some ticketing providers tests failed"
        Write-Info "Check the logs above for details"
        exit 1
    }
}

# Run main function
Main 