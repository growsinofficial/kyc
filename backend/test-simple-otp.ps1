$timestamp = Get-Date -Format "HHmmss"
$mobileNumber = "9876" + $timestamp.Substring(0,6)
$testEmail = "testuser_$timestamp@example.com"

Write-Host "Testing Complete OTP Flow with Dummy Values"
Write-Host "Email: $testEmail"
Write-Host "Mobile: $mobileNumber"
Write-Host ""

# 1. Register User
Write-Host "1. Registering user..."
$registerBody = @{
    name = "Test User $timestamp"
    email = $testEmail
    mobile = $mobileNumber
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "Registration successful: $($registerResponse.user.email)"
    $authToken = $registerResponse.token
} catch {
    Write-Host "Registration failed: $($_.Exception.Message)"
    exit 1
}

# 2. Request Email OTP
Write-Host "2. Requesting Email OTP..."
$emailOtpBody = @{ email = $testEmail } | ConvertTo-Json

try {
    $emailOtpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-email-otp" -Method POST -Body $emailOtpBody -ContentType "application/json"
    Write-Host "Email OTP request successful"
    if ($emailOtpResponse.testOtp) {
        Write-Host "TEST OTP: $($emailOtpResponse.testOtp)"
        $emailOtp = $emailOtpResponse.testOtp
    } else {
        $emailOtp = "123456"
        Write-Host "TEST OTP: $emailOtp (default)"
    }
} catch {
    Write-Host "Email OTP request failed: $($_.Exception.Message)"
}

# 3. Verify Email OTP
Write-Host "3. Verifying Email OTP..."
$verifyEmailBody = @{
    email = $testEmail
    otp = $emailOtp
} | ConvertTo-Json

try {
    $verifyEmailResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-email-otp" -Method POST -Body $verifyEmailBody -ContentType "application/json"
    Write-Host "Email OTP verification successful"
} catch {
    Write-Host "Email OTP verification failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "DUMMY OTP VALUES FOR TESTING:"
Write-Host "Email OTP: 123456"
Write-Host "Mobile OTP: 654321"
Write-Host ""
Write-Host "Use these values in your frontend for testing!"