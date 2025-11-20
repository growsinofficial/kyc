$timestamp = Get-Date -Format "HHmmss"
$mobileNumber = "9876" + $timestamp.Substring(0,6)  # Create 10-digit number
$body = @{
    name = "Test User $timestamp"
    email = "testuser_$timestamp@example.com"
    mobile = $mobileNumber
    password = "TestPassword123!"
} | ConvertTo-Json

Write-Host "Testing user registration..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Registration successful:"
    Write-Host "User ID: $($response.user.id)"
    Write-Host "Name: $($response.user.name)"
    Write-Host "Email: $($response.user.email)"
    Write-Host "Token received: $($response.token -ne $null)"
    
    # Test login
    Write-Host "`nTesting login..."
    $loginBody = @{
        identifier = $response.user.email
        password = "TestPassword123!"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful:"
    Write-Host "User ID: $($loginResponse.user.id)"
    Write-Host "Token received: $($loginResponse.token -ne $null)"
    
    # Test OTP request
    Write-Host "`nTesting OTP request..."
    $otpBody = @{
        email = $response.user.email
    } | ConvertTo-Json
    
    try {
        $otpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-email-otp" -Method POST -Body $otpBody -ContentType "application/json"
        Write-Host "✅ OTP request successful: $($otpResponse.message)"
    } catch {
        Write-Host "❌ OTP request failed (expected): $($_.Exception.Message)"
    }
    
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}