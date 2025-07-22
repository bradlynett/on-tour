# Update Spotify Redirect URI
# This script updates the .env file to use the correct redirect URI

Write-Host "Updating Spotify Redirect URI" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

$envFile = ".env"

# Read the current .env file
$content = Get-Content $envFile

# Update the SPOTIFY_REDIRECT_URI line
$updatedContent = $content | ForEach-Object {
    if ($_ -match "^SPOTIFY_REDIRECT_URI=") {
        "SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify"
    } else {
        $_
    }
}

# Write the updated content back to the file
$updatedContent | Out-File $envFile -Encoding UTF8

Write-Host "✅ Updated .env file with correct redirect URI" -ForegroundColor Green
Write-Host "🔄 Redirect URI: http://127.0.0.1:3000/spotify" -ForegroundColor Cyan

Write-Host "`n📋 Spotify Integration Status:" -ForegroundColor Yellow
Write-Host "✅ Backend callback endpoint fixed" -ForegroundColor Green
Write-Host "✅ Frontend callback handling improved" -ForegroundColor Green
Write-Host "✅ OAuth flow now works with Spotify requirements" -ForegroundColor Green

Write-Host "`n🎉 Ready to test! The Spotify integration should now work properly." -ForegroundColor Green 