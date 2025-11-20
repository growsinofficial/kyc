// Simple HTTP test without external dependencies
import http from 'http';

function testOTPEndpoint() {
  console.log('🧪 Testing OTP endpoint...');
  
  const postData = JSON.stringify({
    email: 'darksoulyt34@gmail.com'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/send-email-otp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.success) {
          console.log('✅ OTP request successful!');
          if (jsonData.testOtp) {
            console.log('🧪 Test OTP:', jsonData.testOtp);
          }
        } else {
          console.log('❌ OTP request failed:', jsonData.error);
        }
      } catch (e) {
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
    console.log('💡 Make sure the backend server is running on port 5000');
  });

  req.write(postData);
  req.end();
}

// Wait a moment for potential server startup
setTimeout(testOTPEndpoint, 2000);