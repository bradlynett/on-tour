# test-login.ps1

# Set the API endpoint (using port 5001 from .env)
$uri = "http://localhost:5001/api/auth/login"

# Set the login data (using the email that was already registered)
$body = @{
    email = "testuser@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

# Set the headers
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Attempting to login with email: testuser@example.com" -ForegroundColor Cyan

# Make the POST request
try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -Headers $headers
    Write-Host "Login successful!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Login failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response -ne $null) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
} 