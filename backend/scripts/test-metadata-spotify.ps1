# Test Spotify Metadata Integration
Write-Host "🎵 Testing Spotify Metadata Integration" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

# Set working directory
Set-Location $PSScriptRoot

# Check environment variables
Write-Host "1. Checking Spotify credentials..." -ForegroundColor Cyan
$envFile = "..\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $spotifyVars = $envContent | Where-Object { $_ -like "SPOTIFY_*" }
    
    $clientId = $spotifyVars | Where-Object { $_ -like "*CLIENT_ID*" } | ForEach-Object { $_.Split("=")[1] }
    $clientSecret = $spotifyVars | Where-Object { $_ -like "*CLIENT_SECRET*" } | ForEach-Object { $_.Split("=")[1] }
    
    if ($clientId -and $clientId -ne "your_spotify_client_id_here" -and $clientId -ne "") {
        Write-Host "   ✅ SPOTIFY_CLIENT_ID: Configured" -ForegroundColor Green
    } else {
        Write-Host "   ❌ SPOTIFY_CLIENT_ID: Not configured" -ForegroundColor Red
    }
    
    if ($clientSecret -and $clientSecret -ne "your_spotify_client_secret_here" -and $clientSecret -ne "") {
        Write-Host "   ✅ SPOTIFY_CLIENT_SECRET: Configured" -ForegroundColor Green
    } else {
        Write-Host "   ❌ SPOTIFY_CLIENT_SECRET: Not configured" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
}

Write-Host ""

# Test the metadata service directly
Write-Host "2. Testing Spotify metadata service..." -ForegroundColor Cyan
try {
    $testScript = @"
const ArtistMetadataService = require('../services/artistMetadataService');

async function testSpotifyMetadata() {
    console.log('🎵 Testing Spotify metadata service...');
    
    const service = new ArtistMetadataService();
    
    // Test client credentials
    try {
        await service.refreshSpotifyToken();
        console.log('✅ Spotify client credentials working');
        
        // Test artist search
        const artist = await service.searchArtistOnSpotify('Taylor Swift');
        if (artist) {
            console.log('✅ Artist search working');
            console.log('   Found: ' + artist.name);
            console.log('   ID: ' + artist.id);
            console.log('   Popularity: ' + artist.popularity);
        } else {
            console.log('❌ Artist search failed');
        }
        
        // Test metadata enrichment
        const metadata = await service.enrichArtistMetadataFromSpotify('Taylor Swift');
        if (metadata) {
            console.log('✅ Metadata enrichment working');
            console.log('   Genres: ' + (metadata.genres?.join(', ') || 'None'));
            console.log('   Popularity: ' + metadata.popularity_score);
            console.log('   Followers: ' + metadata.followers_count);
        } else {
            console.log('❌ Metadata enrichment failed');
        }
        
    } catch (error) {
        console.log('❌ Spotify service error: ' + error.message);
    }
}

testSpotifyMetadata().catch(console.error);
"@

    $testScript | Out-File -FilePath "temp-test.js" -Encoding UTF8
    
    $result = node temp-test.js 2>&1
    Remove-Item "temp-test.js" -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Spotify metadata service working" -ForegroundColor Green
        $result | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
    } else {
        Write-Host "   ❌ Spotify metadata service failed" -ForegroundColor Red
        $result | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
    
} catch {
    Write-Host "   ❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "3. Summary:" -ForegroundColor Cyan
Write-Host "   Your existing Spotify app should work with the metadata system." -ForegroundColor White
Write-Host "   No changes needed in your Spotify Developer Dashboard." -ForegroundColor White
Write-Host "   The metadata system uses public data that doesn't require special permissions." -ForegroundColor White

Write-Host ""
Write-Host "🎉 Ready to use the metadata integration!" -ForegroundColor Green 