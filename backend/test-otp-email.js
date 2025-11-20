import fetch from 'node-fetch';

async function testOTPEmail() {
    const testEmail = 'darksoulyt34@gmail.com';
    
    console.log('🧪 Testing OTP Email Endpoint...');
    console.log('Email:', testEmail);
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/send-email-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testEmail
            })
        });
        
        const data = await response.json();
        
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);
        
        if (response.ok) {
            console.log('✅ OTP Email request successful!');
            if (data.testOtp) {
                console.log('🧪 Test OTP:', data.testOtp);
            }
        } else {
            console.log('❌ OTP Email request failed:', data.error);
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testOTPEmail();