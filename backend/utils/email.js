import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password instead of OAuth2
    },
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const message = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(message);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, name = '') => {
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Email Verification</h2>
      <p>Hello ${name},</p>
      <p>Your OTP for email verification is:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated message from KYC Platform. Please do not reply to this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Email Verification OTP - KYC Platform',
    html: message
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to KYC Platform!</h2>
      <p>Hello ${name},</p>
      <p>Welcome to our KYC platform! We're excited to have you on board.</p>
      <p>To get started, please complete your KYC process by following these steps:</p>
      <ol>
        <li>Verify your email and mobile number</li>
        <li>Fill in your personal information</li>
        <li>Complete the risk assessment</li>
        <li>Upload required documents</li>
        <li>Choose your investment plan</li>
      </ol>
      <p>If you have any questions, feel free to contact our support team.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated message from KYC Platform. Please do not reply to this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Welcome to KYC Platform',
    html: message
  });
};

// Send KYC status update email
const sendKYCStatusEmail = async (email, name, status, reason = '') => {
  let message;
  let subject;

  switch (status) {
    case 'approved':
      subject = 'KYC Verification Approved';
      message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">KYC Verification Approved!</h2>
          <p>Hello ${name},</p>
          <p>Congratulations! Your KYC verification has been approved successfully.</p>
          <p>You can now access all platform features and proceed with your investment journey.</p>
          <p>Thank you for choosing our platform!</p>
        </div>
      `;
      break;

    case 'rejected':
      subject = 'KYC Verification Status Update';
      message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">KYC Verification Update</h2>
          <p>Hello ${name},</p>
          <p>We need additional information for your KYC verification.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please log in to your account and update the required information.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `;
      break;

    case 'pending_review':
      subject = 'KYC Verification Under Review';
      message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107;">KYC Verification Under Review</h2>
          <p>Hello ${name},</p>
          <p>Thank you for submitting your KYC information. We have received your documents and they are currently under review.</p>
          <p>We will notify you once the review is complete. This usually takes 1-2 business days.</p>
          <p>Thank you for your patience!</p>
        </div>
      `;
      break;

    default:
      return;
  }

  return await sendEmail({
    to: email,
    subject,
    html: message
  });
};

export {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendKYCStatusEmail
};