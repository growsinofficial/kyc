# Testing Guide: Dummy OTP Values for KYC Application

## 🧪 **Test Mode Configuration**

Your KYC application is configured with `TEST_MODE=true` which provides fixed dummy OTP values for testing.

## 🔑 **Dummy OTP Values**

### **Email OTP**
- **Value**: `123456`
- **Usage**: For email verification during registration and login flows
- **Expiry**: 10 minutes from generation

### **Mobile OTP** 
- **Value**: `654321`
- **Usage**: For mobile number verification
- **Expiry**: 10 minutes from generation

## 📱 **Testing Workflow**

### 1. **User Registration**
```json
POST /api/auth/register
{
  "name": "Test User",
  "email": "test@example.com", 
  "mobile": "9876543210",
  "password": "TestPassword123!"
}
```
**Response**: User created + JWT token returned

### 2. **Request Email OTP**
```json
POST /api/auth/send-email-otp
{
  "email": "test@example.com"
}
```
**Response**: 
```json
{
  "success": true,
  "message": "A verification code has been sent to your email.",
  "testOtp": "123456"
}
```

### 3. **Verify Email OTP**
```json
POST /api/auth/verify-email-otp
{
  "email": "test@example.com",
  "otp": "123456"
}
```
**Response**: Email verified successfully

### 4. **Verify Mobile OTP** (requires authentication)
```json
POST /api/auth/verify-mobile
Authorization: Bearer <jwt_token>
{
  "otp": "654321"
}
```
**Response**: Mobile verified successfully

## 🚀 **Frontend Integration**

### **In your React components:**
```javascript
// Email OTP Verification
const verifyEmailOTP = async (email) => {
  const response = await fetch('/api/auth/verify-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      otp: '123456'  // Use this dummy value for testing
    })
  });
  return response.json();
};

// Mobile OTP Verification  
const verifyMobileOTP = async (token) => {
  const response = await fetch('/api/auth/verify-mobile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      otp: '654321'  // Use this dummy value for testing
    })
  });
  return response.json();
};
```

## 🔧 **Available API Endpoints**

| Endpoint | Method | Purpose | Test OTP |
|----------|--------|---------|----------|
| `/api/auth/send-email-otp` | POST | Request email OTP | Returns `123456` |
| `/api/auth/verify-email-otp` | POST | Verify email OTP | Use `123456` |
| `/api/auth/verify-mobile` | POST | Verify mobile OTP | Use `654321` |
| `/api/auth/resend-otp` | POST | Resend mobile OTP | Returns `654321` |

## ✅ **Testing Checklist**

- [x] User registration with Indian mobile numbers (10 digits)
- [x] Email OTP generation (always `123456` in test mode)
- [x] Mobile OTP generation (always `654321` in test mode)  
- [x] OTP verification endpoints working
- [x] JWT token authentication
- [x] Rate limiting (30-second cooldown)
- [x] Database persistence

## 🎯 **Next Steps for Production**

1. **Set `TEST_MODE=false`** in production
2. **Configure real OAuth 2.0 email credentials**
3. **Integrate SMS provider** (Twilio, AWS SNS, etc.)
4. **Rotate all secrets** (MongoDB URI, JWT secrets)

## 🛡️ **Security Notes**

- Dummy OTPs only work when `TEST_MODE=true`
- Production will generate random 6-digit OTPs
- OTPs expire after 10 minutes
- Rate limiting prevents OTP spam (30-second cooldown)
- Failed attempts are tracked to prevent brute force

---

**Ready for frontend integration! Use the dummy OTP values above to test your complete user flow.** 🚀