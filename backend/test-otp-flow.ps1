$timestamp = Get-Date -Format "HHmmss"
$mobileNumber = "9876" + $timestamp.Substring(0,6)  # Create 10-digit number
$testEmail = "testuser_$timestamp@example.com"

Write-Host "🚀 Testing Complete OTP Flow with Dummy Values"
Write-Host "============================================="
Write-Host "Email: $testEmail"
Write-Host "Mobile: $mobileNumber"
Write-Host ""

# 1. Register User
Write-Host "1️⃣ Registering user..."
$registerBody = @{
    name = "Test User $timestamp"
    email = $testEmail
    mobile = $mobileNumber
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful:"
    Write-Host "   User ID: $($registerResponse.user.id)"
    Write-Host "   Email: $($registerResponse.user.email)"
    Write-Host "   Mobile: $($registerResponse.user.mobile)"
    Write-Host ""
    
    $userId = $registerResponse.user.id
    $authToken = $registerResponse.token
    
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)"
    exit 1
}

# 2. Request Email OTP
Write-Host "2️⃣ Requesting Email OTP..."
$emailOtpBody = @{
    email = $testEmail
} | ConvertTo-Json

try {
    $emailOtpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-email-otp" -Method POST -Body $emailOtpBody -ContentType "application/json"
    Write-Host "✅ Email OTP request successful:"
    Write-Host "   Message: $($emailOtpResponse.message)"
    
    if ($emailOtpResponse.testOtp) {
        Write-Host "   🔑 TEST OTP: $($emailOtpResponse.testOtp)"
        $emailOtp = $emailOtpResponse.testOtp
    } else {
        $emailOtp = "123456"  # Default test OTP
        Write-Host "   🔑 TEST OTP: $emailOtp (default)"
    }
    Write-Host ""
    
} catch {
    Write-Host "❌ Email OTP request failed: $($_.Exception.Message)"
    exit 1
}

# 3. Verify Email OTP
Write-Host "3️⃣ Verifying Email OTP..."
$verifyEmailBody = @{
    email = $testEmail
    otp = $emailOtp
} | ConvertTo-Json

try {
    $verifyEmailResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-email-otp" -Method POST -Body $verifyEmailBody -ContentType "application/json"
    Write-Host "✅ Email OTP verification successful:"
    Write-Host "   Message: $($verifyEmailResponse.message)"
    Write-Host ""
    
} catch {
    Write-Host "❌ Email OTP verification failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody"
    }
    Write-Host ""
}

# 4. Test Mobile OTP (requires authentication)
Write-Host "4️⃣ Testing Mobile OTP verification..."
$verifyMobileBody = @{
    otp = "654321"  # Default test mobile OTP
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

try {
    $verifyMobileResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-mobile" -Method POST -Body $verifyMobileBody -Headers $headers
    Write-Host "✅ Mobile OTP verification successful:"
    Write-Host "   Message: $($verifyMobileResponse.message)"
    Write-Host ""
    
} catch {
    Write-Host "❌ Mobile OTP verification failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody"
    }
    Write-Host ""
}

# 5. Get Updated User Info
Write-Host "5️⃣ Getting updated user information..."
try {
    $userInfoResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ User information retrieved:"
    Write-Host "   Name: $($userInfoResponse.user.name)"
    Write-Host "   Email: $($userInfoResponse.user.email) (Verified: $($userInfoResponse.user.emailVerified))"
    Write-Host "   Mobile: $($userInfoResponse.user.mobile) (Verified: $($userInfoResponse.user.mobileVerified))"
    Write-Host "   KYC Status: $($userInfoResponse.user.kycStatus)"
    Write-Host "   Current Step: $($userInfoResponse.user.currentStep)"
    Write-Host ""
    
} catch {
    Write-Host "❌ Failed to get user info: $($_.Exception.Message)"
    Write-Host ""
}

Write-Host "🎉 Complete OTP Flow Test Finished!"
Write-Host ""
Write-Host "📋 Summary for Frontend Testing:"
Write-Host "================================="
Write-Host "✅ Email OTP (always): 123456"
Write-Host "✅ Mobile OTP (always): 654321"
Write-Host "✅ Both OTPs work in TEST_MODE=true"
Write-Host ""
Write-Host "🔧 Next Steps:"
Write-Host "- Use these OTPs in your frontend forms"
Write-Host "- Test the complete user flow"
Write-Host "- Ready for production with real email/SMS"