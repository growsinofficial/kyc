# Frontend API Integration Debug Guide

## 🐛 **Common Issues & Solutions**

### **1. 404 Errors for `/auth/send-mobile-otp` and `/auth/verify-mobile-otp`**

✅ **FIXED**: These endpoints are now available:
- `POST /api/auth/send-mobile-otp`
- `POST /api/auth/verify-mobile-otp`
- `POST /api/auth/send-email-otp` 
- `POST /api/auth/verify-email-otp`

### **2. Frontend API Service Improvements**

The API service now handles non-JSON responses properly (like 404 HTML pages).

### **3. Testing the API from Frontend**

Use these test calls to verify everything works:

```javascript
// Test Email OTP
const testEmailOTP = async () => {
  try {
    // 1. Register user first
    const registerResponse = await apiService.register({
      name: "Test User",
      email: "test@example.com",
      mobile: "9876543210",
      password: "TestPassword123!"
    });
    
    // 2. Send Email OTP
    const otpResponse = await apiService.sendEmailOTP("test@example.com");
    console.log("Email OTP Response:", otpResponse);
    // Should return: { success: true, testOtp: "123456" }
    
    // 3. Verify Email OTP
    const verifyResponse = await apiService.verifyEmailOTP("test@example.com", "123456");
    console.log("Email Verify Response:", verifyResponse);
    
  } catch (error) {
    console.error("Email OTP test failed:", error);
  }
};

// Test Mobile OTP
const testMobileOTP = async () => {
  try {
    // 1. Send Mobile OTP (user must exist first)
    const otpResponse = await apiService.sendMobileOTP("9876543210");
    console.log("Mobile OTP Response:", otpResponse);
    // Should return: { success: true, testOtp: "654321" }
    
    // 2. Verify Mobile OTP
    const verifyResponse = await apiService.verifyMobileOTP("9876543210", "654321");
    console.log("Mobile Verify Response:", verifyResponse);
    
  } catch (error) {
    console.error("Mobile OTP test failed:", error);
  }
};
```

### **4. Dummy OTP Values for Testing**

When `TEST_MODE=true` (current setting):

- **Email OTP**: Always `123456`
- **Mobile OTP**: Always `654321`

### **5. Common Mistakes to Avoid**

❌ **Wrong**: Trying to send mobile OTP before user registration
```javascript
// This will fail with "User not found"
await apiService.sendMobileOTP("9876543210"); // User doesn't exist yet
```

✅ **Correct**: Register user first, then send OTP
```javascript
// 1. Register user
await apiService.register({...});

// 2. Then send OTP
await apiService.sendMobileOTP("9876543210");
```

❌ **Wrong**: Using wrong mobile number format
```javascript
await apiService.sendMobileOTP("+91-9876543210"); // Invalid format
```

✅ **Correct**: Use 10-digit Indian mobile number
```javascript
await apiService.sendMobileOTP("9876543210"); // Valid format
```

### **6. Debug Steps**

1. **Check Network Tab**: Verify the correct URLs are being called
2. **Check Console**: Look for CORS or network errors
3. **Check Backend Logs**: See if requests are reaching the server
4. **Test with Postman/curl**: Verify backend endpoints work independently

### **7. Working Test Flow**

```javascript
const testCompleteFlow = async () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Test User",
    email: `test_${timestamp}@example.com`,
    mobile: `9876${timestamp.toString().slice(-6)}`, // 10-digit mobile
    password: "TestPassword123!"
  };

  try {
    // 1. Register
    console.log("1. Registering user...");
    const registerResponse = await apiService.register(testUser);
    console.log("✅ Registration successful");

    // 2. Email OTP
    console.log("2. Sending email OTP...");
    const emailOTP = await apiService.sendEmailOTP(testUser.email);
    console.log("✅ Email OTP sent:", emailOTP.testOtp);

    console.log("3. Verifying email OTP...");
    await apiService.verifyEmailOTP(testUser.email, emailOTP.testOtp || "123456");
    console.log("✅ Email verified");

    // 3. Mobile OTP
    console.log("4. Sending mobile OTP...");
    const mobileOTP = await apiService.sendMobileOTP(testUser.mobile);
    console.log("✅ Mobile OTP sent:", mobileOTP.testOtp);

    console.log("5. Verifying mobile OTP...");
    await apiService.verifyMobileOTP(testUser.mobile, mobileOTP.testOtp || "654321");
    console.log("✅ Mobile verified");

    console.log("🎉 Complete flow successful!");

  } catch (error) {
    console.error("❌ Flow failed:", error);
  }
};

// Run the test
testCompleteFlow();
```

### **8. API Endpoint Summary**

| Endpoint | Method | Purpose | Test Value |
|----------|--------|---------|------------|
| `/auth/register` | POST | User registration | - |
| `/auth/login` | POST | User authentication | - |
| `/auth/send-email-otp` | POST | Request email OTP | Returns `123456` |
| `/auth/verify-email-otp` | POST | Verify email OTP | Use `123456` |
| `/auth/send-mobile-otp` | POST | Request mobile OTP | Returns `654321` |
| `/auth/verify-mobile-otp` | POST | Verify mobile OTP | Use `654321` |
| `/auth/me` | GET | Get current user | Requires auth token |

---

**✅ All endpoints are working. The frontend should now be able to complete the full OTP verification flow!**