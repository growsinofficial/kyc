import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  console.log('EMAIL_USERNAME:', process.env.EMAIL_USERNAME);
  console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');
  console.log('Nodemailer version check:', typeof nodemailer);
  console.log('Available methods:', Object.keys(nodemailer));

  if (!process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ GMAIL_APP_PASSWORD is not set!');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify connection
    console.log('🔄 Verifying connection...');
    await transporter.verify();
    console.log('✅ Email transporter verified successfully!');

    // Send test email
    const testMessage = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: process.env.EMAIL_USERNAME, // Send to self for testing
      subject: 'Test Email - KYC Platform',
      html: `
        <h2>Email Test Successful! 🎉</h2>
        <p>This is a test email to verify the Gmail App Password configuration.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    };

    console.log('📧 Sending test email...');
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
      console.log('4. Make sure EMAIL_USERNAME is the correct Gmail address');
    } else if (error.code === 'ESOCKET') {
      console.log('\n🔧 Network error - check your internet connection');
    }
  }
}

testEmail();