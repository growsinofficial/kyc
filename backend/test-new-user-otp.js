// Test OTP email for non-existing user
import http from 'http';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testNewUserOTP() {
  console.log('🧪 Testing OTP for NEW (non-existing) user...\n');
  
  // Use a different email that doesn't exist
  const newEmail = 'newuser@example.com';

  try {
    // Step 1: Request OTP for non-existing user
    console.log('📧 Step 1: Requesting OTP for non-existing user...');
    const otpResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/send-email-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ email: newEmail }));
    
    console.log('OTP Status:', otpResponse.status);
    console.log('OTP Response:', otpResponse.data);
    
    if (otpResponse.data.success) {
      console.log('✅ OTP sent to non-existing user!');
      if (otpResponse.data.testOtp) {
        console.log('🧪 Test OTP:', otpResponse.data.testOtp);
        
        // Step 2: Try to verify the OTP
        console.log('\n🔍 Step 2: Verifying registration OTP...');
        const verifyResponse = await makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: '/api/auth/verify-email-otp',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ 
          email: newEmail, 
          otp: otpResponse.data.testOtp 
        }));
        
        console.log('Verify Status:', verifyResponse.status);
        console.log('Verify Response:', verifyResponse.data);
        
        if (verifyResponse.data.success && verifyResponse.data.isRegistrationOTP) {
          console.log('✅ Registration OTP verified successfully!');
        }
      }
    } else {
      console.log('❌ OTP request failed for non-existing user');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait for server
setTimeout(testNewUserOTP, 1000);