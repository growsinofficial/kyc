import { sendEmail } from './utils/email.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOTPEmailFunction() {
  console.log('🧪 Testing OTP Email Function...');
  
  const otp = '123456';
  const email = 'darksoulyt34@gmail.com';
  
  try {
    console.log('📧 Sending OTP email...');
    await sendEmail({
      to: email,
      subject: 'Your Email Verification Code',
      html: `<h1>Your Verification Code is: ${otp}</h1><p>This code will expire in 10 minutes.</p>`
    });
    
    console.log('✅ OTP email sent successfully!');
    
  } catch (emailError) {
    console.error('❌ Failed to send verification email:', emailError);
    console.error('Error details:', emailError.message);
    console.error('Error code:', emailError.code);
  }
}

testOTPEmailFunction();