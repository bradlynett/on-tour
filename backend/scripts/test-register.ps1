# test-register.ps1

# Simple registration test
$baseUrl = "http://localhost:5001/api"

Write-Host "Testing registration..." -ForegroundColor Green

$body = @{
    email = "brad@lynett.com"
    password = "Password123"
    firstName = "Brad"
    lastName = "Lynett"
    phone = "+15550123"
} | ConvertTo-Json

Write-Host "Request body: $body" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Success: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
} 