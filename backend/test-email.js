import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test email configuration
async function testEmail() {
  console.log('🧪 Testing email configuration...');
  console.log('EMAIL_USERNAME:', process.env.EMAIL_USERNAME);
  console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');

  if (!process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ GMAIL_APP_PASSWORD is not set! This is required for Gmail SMTP.');
    console.log('\n📋 To fix this, you need to:');
    console.log('1. Go to Google Account settings: https://myaccount.google.com/');
    console.log('2. Navigate to Security > 2-Step Verification');
    console.log('3. Go to App passwords');
    console.log('4. Generate a new app password for "Mail"');
    console.log('5. Copy the 16-character password to your .env file as GMAIL_APP_PASSWORD');
    return;
  }

  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Email transporter verified successfully!');

    // Send test email
    const testMessage = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: process.env.EMAIL_USERNAME, // Send to self for testing
      subject: 'Test Email - KYC Platform',
      html: `
        <h2>Email Test Successful! 🎉</h2>
        <p>This is a test email to verify the Gmail OAuth configuration.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    };

    const info = await transporter.sendMail(testMessage);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('To:', testMessage.to);

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication error - possible fixes:');
      console.log('1. Check if GMAIL_APP_PASSWORD is correct');
      console.log('2. Make sure 2-Step Verification is enabled on your Google account');
      console.log('3. Generate a new App Password if the current one is invalid');
    } else if (error.code === 'ESOCKET') {
      console.log('\n🔧 Network error - check your internet connection');
    }
  }
}

testEmail();