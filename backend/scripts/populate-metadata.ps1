# Artist Metadata Population PowerShell Script
# This script provides an easy way to populate artist metadata from multiple sources

param(
    [int]$Limit = 50,
    [string]$Source = "unified",
    [switch]$Force,
    [switch]$DryRun,
    [switch]$Stats,
    [switch]$Help
)

# Set working directory to script location
Set-Location $PSScriptRoot

# Function to show help
function Show-Help {
    Write-Host @"
🎵 Artist Metadata Population Script

This script automatically populates artist metadata from multiple sources:
- Spotify (primary source for popularity and current data)
- MusicBrainz (comprehensive biographical and discography data)
- Last.fm (community-driven tags and similar artists)

Usage:
  .\populate-metadata.ps1 [options]

Parameters:
  -Limit <number>     Number of artists to process (default: 50)
  -Source <source>    Specific source to use: spotify, musicbrainz, lastfm, unified (default: unified)
  -Force              Force refresh existing metadata
  -DryRun            Show what would be done without making changes
  -Stats             Show metadata statistics only
  -Help              Show this help message

Examples:
  .\populate-metadata.ps1 -Limit 100 -Source unified
  .\populate-metadata.ps1 -Source spotify -DryRun
  .\populate-metadata.ps1 -Stats
  .\populate-metadata.ps1 -Force -Limit 25

Sources:
  unified     - Use all sources with intelligent merging (recommended)
  spotify     - Use only Spotify API
  musicbrainz - Use only MusicBrainz API
  lastfm      - Use only Last.fm API
"@
}

# Function to check if Node.js is available
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
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
    
    Write-Host "🔍 Checking environment variables..." -ForegroundColor Yellow
    
    $missing = @()
    foreach ($var in $requiredVars) {
        if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
            $missing += $var
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
        foreach ($var in $missing) {
            Write-Host "  - $var" -ForegroundColor Red
        }
        Write-Host "`nPlease set these variables in your environment or .env file" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "✅ Required environment variables found" -ForegroundColor Green
    
    # Check optional variables
    foreach ($var in $optionalVars) {
        if (Get-Item "env:$var" -ErrorAction SilentlyContinue) {
            Write-Host "✅ Optional variable found: $var" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Optional variable not set: $var (some features may be limited)" -ForegroundColor Yellow
        }
    }
    
    return $true
}

# Function to build command arguments
function Build-CommandArgs {
    $args = @()
    
    if ($Limit -ne 50) {
        $args += "--limit"
        $args += $Limit
    }
    
    if ($Source -ne "unified") {
        $args += "--source"
        $args += $Source
    }
    
    if ($Force) {
        $args += "--force"
    }
    
    if ($DryRun) {
        $args += "--dry-run"
    }
    
    if ($Stats) {
        $args += "--stats"
    }
    
    return $args
}

# Function to run the metadata population
function Start-MetadataPopulation {
    param(
        [string[]]$Arguments
    )
    
    Write-Host "🚀 Starting metadata population..." -ForegroundColor Green
    Write-Host "Command: node populate-artist-metadata.js $($Arguments -join ' ')" -ForegroundColor Cyan
    
    try {
        $process = Start-Process -FilePath "node" -ArgumentList @("populate-artist-metadata.js") + $Arguments -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Metadata population completed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Metadata population failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            exit $process.ExitCode
        }
    }
    catch {
        Write-Host "❌ Failed to run metadata population: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Main execution
function Main {
    Write-Host "🎵 Artist Metadata Population Script" -ForegroundColor Magenta
    Write-Host "=====================================" -ForegroundColor Magenta
    Write-Host ""
    
    # Show help if requested
    if ($Help) {
        Show-Help
        return
    }
    
    # Validate source parameter
    $validSources = @("unified", "spotify", "musicbrainz", "lastfm")
    if ($Source -notin $validSources) {
        Write-Host "❌ Invalid source: $Source" -ForegroundColor Red
        Write-Host "Valid sources: $($validSources -join ', ')" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if Node.js is available
    if (-not (Test-NodeJS)) {
        Write-Host "❌ Node.js is required but not found" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    
    # Check environment variables
    if (-not (Test-EnvironmentVariables)) {
        exit 1
    }
    
    # Build command arguments
    $args = Build-CommandArgs
    
    # Show what will be executed
    Write-Host "📋 Configuration:" -ForegroundColor Yellow
    Write-Host "  Limit: $Limit" -ForegroundColor White
    Write-Host "  Source: $Source" -ForegroundColor White
    Write-Host "  Force: $Force" -ForegroundColor White
    Write-Host "  Dry Run: $DryRun" -ForegroundColor White
    Write-Host "  Stats Only: $Stats" -ForegroundColor White
    Write-Host ""
    
    # Confirm execution (unless it's a dry run or stats)
    if (-not $DryRun -and -not $Stats) {
        $confirmation = Read-Host "Do you want to proceed with metadata population? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
            return
        }
    }
    
    # Run the metadata population
    Start-MetadataPopulation -Arguments $args
}

# Run the main function
Main 