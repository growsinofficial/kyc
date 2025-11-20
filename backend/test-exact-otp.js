import { sendEmail } from './utils/email.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testExactOTPEmail() {
  console.log('🧪 Testing EXACT OTP Email (mimicking auth route)...');
  
  const user = { email: 'darksoulyt34@gmail.com' };
  const otp = '567890'; // Different from test to distinguish
  
  try {
    console.log(`📧 Attempting to send OTP email to: ${user.email}`);
    console.log(`📧 OTP: ${otp}`);
    
    await sendEmail({
      to: user.email,
      subject: 'Your Email Verification Code',
      html: `<h1>Your Verification Code is: ${otp}</h1><p>This code will expire in 10 minutes.</p>`
    });
    
    console.log(`✅ OTP email sent successfully to: ${user.email}`);
    
  } catch (emailError) {
    console.error('❌ Failed to send verification email:', emailError);
    console.error('❌ Email error details:', emailError.message);
  }
}

testExactOTPEmail();