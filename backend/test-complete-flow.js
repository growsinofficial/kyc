// Test complete signup and OTP flow
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

async function testCompleteFlow() {
  console.log('🧪 Testing complete signup and OTP flow...\n');
  
  const testUser = {
    name: 'Test User',
    email: 'darksoulyt34@gmail.com',
    mobile: '9876543210',
    password: 'TestPassword123!'
  };

  try {
    // Step 1: Try to register user
    console.log('📝 Step 1: Registering user...');
    const signupResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify(testUser));
    
    console.log('Signup Status:', signupResponse.status);
    console.log('Signup Response:', signupResponse.data);
    
    if (signupResponse.status === 400 && signupResponse.data.error?.includes('already exists')) {
      console.log('✅ User already exists, proceeding to OTP step...\n');
    } else if (signupResponse.status === 201) {
      console.log('✅ User created successfully!\n');
    } else {
      console.log('❌ Unexpected signup response\n');
    }
    
    // Step 2: Request email OTP
    console.log('📧 Step 2: Requesting email OTP...');
    const otpResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/send-email-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ email: testUser.email }));
    
    console.log('OTP Status:', otpResponse.status);
    console.log('OTP Response:', otpResponse.data);
    
    if (otpResponse.data.success) {
      console.log('✅ OTP request successful!');
      if (otpResponse.data.testOtp) {
        console.log('🧪 Test OTP:', otpResponse.data.testOtp);
      }
    } else {
      console.log('❌ OTP request failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait for server
setTimeout(testCompleteFlow, 1000);