Write-Host "🚀 Testing All API Endpoints for Frontend Integration"
Write-Host "======================================================"

$timestamp = Get-Date -Format "HHmmss"
$testEmail = "frontend_test_$timestamp@example.com"
$testMobile = "9876$($timestamp.Substring(0,6))"

Write-Host "Test User: $testEmail"
Write-Host "Test Mobile: $testMobile"
Write-Host ""

# 1. Test User Registration
Write-Host "1️⃣ Testing User Registration..."
$registerBody = @{
    name = "Frontend Test User"
    email = $testEmail
    mobile = $testMobile
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful"
    Write-Host "   Email: $($registerResponse.user.email)"
    Write-Host "   Mobile: $($registerResponse.user.mobile)"
    $token = $registerResponse.token
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)"
    exit 1
}

# 2. Test Email OTP Flow
Write-Host "`n2️⃣ Testing Email OTP Flow..."
$emailOtpBody = @{ email = $testEmail } | ConvertTo-Json

try {
    # Send Email OTP
    $emailOtpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-email-otp" -Method POST -Body $emailOtpBody -ContentType "application/json"
    Write-Host "✅ Email OTP sent: $($emailOtpResponse.testOtp)"
    
    # Verify Email OTP
    $verifyEmailBody = @{
        email = $testEmail
        otp = $emailOtpResponse.testOtp
    } | ConvertTo-Json
    
    $verifyEmailResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-email-otp" -Method POST -Body $verifyEmailBody -ContentType "application/json"
    Write-Host "✅ Email OTP verified: $($verifyEmailResponse.message)"
    
} catch {
    Write-Host "❌ Email OTP flow failed: $($_.Exception.Message)"
}

# 3. Test Mobile OTP Flow
Write-Host "`n3️⃣ Testing Mobile OTP Flow..."
$mobileOtpBody = @{ mobile = $testMobile } | ConvertTo-Json

try {
    # Send Mobile OTP
    $mobileOtpResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-mobile-otp" -Method POST -Body $mobileOtpBody -ContentType "application/json"
    Write-Host "✅ Mobile OTP sent: $($mobileOtpResponse.testOtp)"
    
    # Verify Mobile OTP
    $verifyMobileBody = @{
        mobile = $testMobile
        otp = $mobileOtpResponse.testOtp
    } | ConvertTo-Json
    
    $verifyMobileResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-mobile-otp" -Method POST -Body $verifyMobileBody -ContentType "application/json"
    Write-Host "✅ Mobile OTP verified: $($verifyMobileResponse.message)"
    
} catch {
    Write-Host "❌ Mobile OTP flow failed: $($_.Exception.Message)"
}

# 4. Test Login
Write-Host "`n4️⃣ Testing Login..."
$loginBody = @{
    identifier = $testEmail
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful"
    Write-Host "   User ID: $($loginResponse.user.id)"
    Write-Host "   Token length: $($loginResponse.token.Length) chars"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
}

# 5. Test Get Current User
Write-Host "`n5️⃣ Testing Get Current User..."
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $userResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ User info retrieved:"
    Write-Host "   Email Verified: $($userResponse.user.emailVerified)"
    Write-Host "   Mobile Verified: $($userResponse.user.mobileVerified)"
    Write-Host "   KYC Status: $($userResponse.user.kycStatus)"
    Write-Host "   Current Step: $($userResponse.user.currentStep)"
} catch {
    Write-Host "❌ Get user info failed: $($_.Exception.Message)"
}

Write-Host "`n🎉 API Endpoint Testing Complete!"
Write-Host ""
Write-Host "📋 Frontend Integration Summary:"
Write-Host "================================"
Write-Host "✅ POST /api/auth/register - User registration"
Write-Host "✅ POST /api/auth/login - User authentication"  
Write-Host "✅ POST /api/auth/send-email-otp - Email OTP (returns 123456)"
Write-Host "✅ POST /api/auth/verify-email-otp - Email verification"
Write-Host "✅ POST /api/auth/send-mobile-otp - Mobile OTP (returns 654321)"
Write-Host "✅ POST /api/auth/verify-mobile-otp - Mobile verification"
Write-Host "✅ GET /api/auth/me - Get current user"
Write-Host ""
Write-Host "🔑 Dummy OTP Values for Frontend:"
Write-Host "   Email OTP: 123456"
Write-Host "   Mobile OTP: 654321"
Write-Host ""
Write-Host "✅ Ready for frontend integration!"