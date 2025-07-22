# Metadata Services Test PowerShell Script
# This script provides an easy way to test all metadata services

param(
    [string]$Artist = "",
    [string]$Source = "unified",
    [switch]$All,
    [switch]$Help
)

# Set working directory to script location
Set-Location $PSScriptRoot

# Load environment variables from .env file
function Load-EnvFile {
    $envPath = Join-Path $PSScriptRoot "..\.env"
    if (Test-Path $envPath) {
        Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
        Get-Content $envPath | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
        Write-Host "Environment variables loaded" -ForegroundColor Green
    } else {
        Write-Host ".env file not found at $envPath" -ForegroundColor Yellow
    }
}

# Load environment variables
Load-EnvFile

# Function to show help
function Show-Help {
    Write-Host "Metadata Services Test Script"
    Write-Host ""
    Write-Host "This script tests all metadata services to ensure they're working correctly:"
    Write-Host "- Spotify Artist API integration"
    Write-Host "- MusicBrainz API integration"
    Write-Host "- Last.fm API integration"
    Write-Host "- Unified metadata service"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\test-metadata.ps1 [options]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Artist <name>      Test with specific artist name"
    Write-Host "  -Source <source>    Test specific source: spotify, musicbrainz, lastfm, unified"
    Write-Host "  -All               Test all sources with multiple artists"
    Write-Host "  -Help              Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\test-metadata.ps1 -Artist 'Taylor Swift'"
    Write-Host "  .\test-metadata.ps1 -Source spotify"
    Write-Host "  .\test-metadata.ps1 -All"
    Write-Host "  .\test-metadata.ps1 -Artist 'Ed Sheeran' -Source unified"
    Write-Host ""
    Write-Host "Sources:"
    Write-Host "  unified     - Test unified metadata service (recommended)"
    Write-Host "  spotify     - Test only Spotify API"
    Write-Host "  musicbrainz - Test only MusicBrainz API"
    Write-Host "  lastfm      - Test only Last.fm API"
}

# Function to check if Node.js is available
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "Node.js not found" -ForegroundColor Red
        return $false
    }
    return $false
}

# Function to check if required environment variables are set
function Test-EnvironmentVariables {
    $requiredVars = @(
        "SPOTIFY_CLIENT_ID",
        "SPOTIFY_CLIENT_SECRET"
    )
    
    $optionalVars = @(
        "LASTFM_API_KEY"
    )
    
    Write-Host "Checking environment variables..." -ForegroundColor Yellow
    
    $missing = @()
    foreach ($var in $requiredVars) {
        if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
            $missing += $var
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "Missing required environment variables:" -ForegroundColor Red
        foreach ($var in $missing) {
            Write-Host "  - $var" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Please set these variables in your environment or .env file" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "Required environment variables found" -ForegroundColor Green
    
    # Check optional variables
    foreach ($var in $optionalVars) {
        if (Get-Item "env:$var" -ErrorAction SilentlyContinue) {
            Write-Host "Optional variable found: $var" -ForegroundColor Green
        } else {
            Write-Host "WARNING: LASTFM_API_KEY is not set - LastFM features will be skipped" -ForegroundColor Yellow
        }
    }
    
    return $true
}

# Function to build command arguments
function Build-CommandArgs {
    $args = @()
    
    if ($Artist) {
        $args += "--artist"
        $args += $Artist
    }
    
    if ($Source -ne "unified") {
        $args += "--source"
        $args += $Source
    }
    
    if ($All) {
        $args += "--all"
    }
    
    return $args
}

# Function to run the metadata test
function Start-MetadataTest {
    param(
        [string[]]$Arguments
    )
    
    Write-Host "Starting metadata services test..." -ForegroundColor Green
    Write-Host "Command: node test-metadata-services.js $($Arguments -join ' ')" -ForegroundColor Cyan
    
    try {
        $allArgs = @("test-metadata-services.js") + $Arguments
        $process = Start-Process -FilePath "node" -ArgumentList $allArgs -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Host "Metadata services test completed successfully" -ForegroundColor Green
        } else {
            Write-Host "Metadata services test failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            exit $process.ExitCode
        }
    }
    catch {
        Write-Host "Failed to run metadata services test: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Function to show test configuration
function Show-TestConfiguration {
    Write-Host "Test Configuration:" -ForegroundColor Yellow
    
    if ($Artist) {
        Write-Host "  Artist: $Artist" -ForegroundColor White
    } else {
        Write-Host "  Artist: Default test artists" -ForegroundColor White
    }
    
    Write-Host "  Source: $Source" -ForegroundColor White
    Write-Host "  Test All: $All" -ForegroundColor White
    Write-Host ""
}

# Main execution
function Main {
    Write-Host "Metadata Services Test Script" -ForegroundColor Magenta
    Write-Host "=============================" -ForegroundColor Magenta
    Write-Host ""
    
    # Show help if requested
    if ($Help) {
        Show-Help
        return
    }
    
    # Validate source parameter
    $validSources = @("unified", "spotify", "musicbrainz", "lastfm")
    if ($Source -notin $validSources) {
        Write-Host "Invalid source: $Source" -ForegroundColor Red
        Write-Host "Valid sources: $($validSources -join ', ')" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if Node.js is available
    if (-not (Test-NodeJS)) {
        Write-Host "Node.js is required but not found" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    
    # Check environment variables
    if (-not (Test-EnvironmentVariables)) {
        exit 1
    }
    
    # Build command arguments
    $args = Build-CommandArgs
    
    # Show test configuration
    Show-TestConfiguration
    
    # Confirm execution
    $confirmation = Read-Host "Do you want to proceed with the metadata services test? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Test cancelled" -ForegroundColor Yellow
        return
    }
    
    # Run the metadata test
    Start-MetadataTest -Arguments $args
}

# Run the main function
Main 