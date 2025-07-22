# PowerShell script to create .env file for Concert Travel App Backend
# Run this script from the root of your project

Write-Host "Creating .env file for Concert Travel App Backend..." -ForegroundColor Green

# Define the backend directory path
$backendPath = "concert-travel-app\backend"
$envFilePath = Join-Path $backendPath ".env"

# Check if backend directory exists
if (-not (Test-Path $backendPath)) {
    Write-Host "Error: Backend directory not found at $backendPath" -ForegroundColor Red
    Write-Host "Please run this script from the root of your Concert Travel App project." -ForegroundColor Yellow
    exit 1
}

# .env file content
$envContent = @"
JWT_SECRET=Gh35WT34`$&!arkGN5687
DB_HOST=localhost
DB_PORT=5433
DB_NAME=concert_travel
DB_USER=postgres
DB_PASSWORD=password
PORT=5001
NODE_ENV=development
REDIS_URL=redis://localhost:6379
SPOTIFY_CLIENT_ID=f7f7055c84664f548560da0bf789c784
SPOTIFY_CLIENT_SECRET=1b0e1e879cb44324a2451f96977f46ba
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify
"@

# Create the .env file
try {
    $envContent | Out-File -FilePath $envFilePath -Encoding UTF8 -NoNewline
    Write-Host "✅ .env file created successfully at: $envFilePath" -ForegroundColor Green
    
    # Verify the file was created
    if (Test-Path $envFilePath) {
        Write-Host "✅ File verification: .env file exists" -ForegroundColor Green
        $fileSize = (Get-Item $envFilePath).Length
        Write-Host "✅ File size: $fileSize bytes" -ForegroundColor Green
        
        # Show the first few lines to verify content
        Write-Host "`n📄 .env file content preview:" -ForegroundColor Cyan
        Get-Content $envFilePath | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Write-Host "  ..." -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Error: File was not created" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error creating .env file: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 .env file setup complete!" -ForegroundColor Green
Write-Host "You can now start your backend server with: cd $backendPath && npm run dev" -ForegroundColor Yellow 