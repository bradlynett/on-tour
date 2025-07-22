# Test Authentication Endpoints

Write-Host "Testing Registration..." -ForegroundColor Green
$registerBody = @{
    email = "test2@example.com"
    password = "password123"
    first_name = "John"
    last_name = "Doe"
    phone = "555-1234"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "Registration successful:" -ForegroundColor Green
    $registerResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Registration failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nTesting Login..." -ForegroundColor Green
$loginBody = @{
    email = "test2@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "Login successful:" -ForegroundColor Green
    $loginResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Login failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
} 