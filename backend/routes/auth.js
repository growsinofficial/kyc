import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { User } from '../models/index.js';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { syncNewUserToZoho } from '../middleware/zohoSync.js';
import { generateOTP } from '../utils/helpers.js';

const router = express.Router();

// Rate limiters
const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false
});

const emailOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req.body?.email || req.ip),
  standardHeaders: true,
  legacyHeaders: false
});

const mobileOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req.body?.mobile || req.ip),
  standardHeaders: true,
  legacyHeaders: false
});

// Temporary storage for registration OTPs (in production, use Redis or database)
const registrationOTPs = new Map();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of registrationOTPs.entries()) {
    if (now > data.expires) {
      registrationOTPs.delete(email);
      console.log(`🧹 Cleaned up expired registration OTP for: ${email}`);
    }
  }
}, 5 * 60 * 1000);

// @desc    OAuth callback for Gmail integration
// @route   GET /api/auth/oauth/callback
// @access  Public
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/?oauth=error&error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/?oauth=error&error=no_code_received`);
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/oauth/callback`,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return res.redirect(`${process.env.FRONTEND_URL}/?oauth=error&error=token_exchange_failed`);
    }

    // Store tokens in environment or database
    // For development, you can log them and manually update .env
    console.log('📧 Gmail OAuth Tokens received:');
    console.log('Access Token:', tokens.access_token);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Expires in:', tokens.expires_in, 'seconds');

    // In production, you would store these securely
    // For now, redirect with success
    res.redirect(`${process.env.FRONTEND_URL}/?oauth=success&message=gmail_connected`);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/?oauth=error&error=callback_failed`);
  }
});

// @desc    Initiate Gmail OAuth flow
// @route   GET /api/auth/oauth/gmail
// @access  Public
router.get('/oauth/gmail', (req, res) => {
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + 
    new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/oauth/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.send',
      access_type: 'offline',
      prompt: 'consent'
    }).toString();

  res.redirect(authUrl);
});

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        kycStatus: user.kycStatus,
        currentStep: user.currentStep,
        kycSubStep: user.kycSubStep,
        kycSubStepStatus: user.kycSubStepStatus,
        flags: user.flags
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerLimiter, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('mobile').isMobilePhone('en-IN').withMessage('Please include a valid mobile number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], syncNewUserToZoho, async (req, res, next) => {
  try {
    console.log('🔍 Register endpoint hit:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, email, mobile, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'mobile';
      return res.status(400).json({
        success: false,
        error: `User with this ${field} already exists`
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      mobile,
      password
    });

    // Generate email verification token
    const emailToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = emailToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Generate mobile OTP - use dummy value in test mode
    const mobileOTP = process.env.TEST_MODE === 'true' ? '654321' : generateOTP();
    user.mobileVerificationOTP = mobileOTP;
    user.mobileVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${emailToken}`;
      const message = `
        <h1>Welcome to KYC Platform!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" target="_blank">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Email Verification - KYC Platform',
        html: message
      });
    } catch (err) {
      console.error('Email sending failed:', err);
      // Continue registration even if email fails
    }

    // In test mode or real app, log/send SMS
    if (process.env.TEST_MODE === 'true') {
      console.log(`🧪 TEST MODE - Mobile OTP for ${mobile}: ${mobileOTP}`);
    } else {
      // In a real app, you would send SMS here
      console.log(`Mobile OTP for ${mobile}: ${mobileOTP}`);
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-email-otp
// @access  Public
router.post('/send-email-otp', emailOtpLimiter, [
  body('email').isEmail().withMessage('Please provide a valid email address')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    let otp;

    if (!user) {
      // User doesn't exist yet - send OTP for registration verification
      console.log(`📧 Sending registration OTP to new email: ${email}`);
      
      // Generate OTP for non-existing user
      otp = process.env.TEST_MODE === 'true' ? '123456' : generateOTP();
      
      // Store OTP temporarily for verification during registration
      registrationOTPs.set(email, {
        otp: otp,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        createdAt: new Date()
      });
      
      console.log(`🧪 Registration OTP for ${email}: ${otp}`);
      
    } else {
      // User exists - normal OTP flow with cooldown logic
      const cooldownTime = process.env.NODE_ENV === 'development' ? 5000 : 30000; // 5s dev, 30s prod
      if (user.lastOtpSentAt && (new Date() - new Date(user.lastOtpSentAt)) < cooldownTime) {
        const timeLeft = Math.ceil((cooldownTime - (new Date() - new Date(user.lastOtpSentAt))) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${timeLeft} seconds before requesting another OTP.`
        });
      }

      // Generate OTP for existing user
      otp = process.env.TEST_MODE === 'true' ? '123456' : generateOTP();
      user.emailVerificationOTP = otp;
      user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10-minute expiry
      user.lastOtpSentAt = new Date();
      await user.save();

      console.log(`🧪 Existing user OTP for ${email}: ${otp}`);
    }

    // Send email for both existing and non-existing users
    try {
      console.log(`📧 Attempting to send OTP email to: ${email}`);
      console.log(`📧 OTP: ${otp}`);
      
      const emailSubject = user ? 'Your Email Verification Code' : 'Your Registration Verification Code';
      const emailContent = user 
        ? `<h1>Your Verification Code is: ${otp}</h1><p>This code will expire in 10 minutes.</p>`
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to KYC Platform!</h2>
            <p>Your registration verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>Please use this code to verify your email during registration.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from KYC Platform. Please do not reply to this email.
            </p>
          </div>
        `;

      await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailContent
      });
      
      console.log(`✅ OTP email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      console.error('❌ Email error details:', emailError.message);
      // Even if email fails, we don't want to reveal that to the user.
      // The error is logged for debugging, but the user gets a generic success message.
    }

    res.status(200).json({
      success: true,
      message: 'A verification code has been sent to your email.',
      ...(process.env.TEST_MODE === 'true' && { testOtp: otp }) // Include OTP in response for testing
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Test endpoint for email OTP verification
// @route   POST /api/auth/test-verify-email
// @access  Public
router.post('/test-verify-email', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working!' });
});

// @desc    Verify email OTP
// @route   POST /api/auth/verify-email-otp
// @access  Public
router.post('/verify-email-otp', emailOtpLimiter, async (req, res, next) => {
  try {
    console.log('🔍 Verify Email OTP endpoint hit:', req.body);
    
    const { email, otp } = req.body;
    
    // Simple validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    // In test mode, accept the dummy OTP
    if (process.env.TEST_MODE === 'true' && otp === '123456') {
      console.log('✅ Test mode: Accepting dummy email OTP');
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully (test mode)',
        isRegistrationOTP: false
      });
    }

    // First, check if this is a registration OTP (for non-existing users)
    const registrationOTP = registrationOTPs.get(email);
    if (registrationOTP) {
      // Check expiration
      if (Date.now() > registrationOTP.expires) {
        registrationOTPs.delete(email);
        return res.status(400).json({
          success: false,
          error: 'Registration OTP has expired. Please request a new one.'
        });
      }

      // Verify registration OTP
      if (registrationOTP.otp === otp) {
        // Valid registration OTP - keep it for use during actual registration
        console.log(`✅ Registration OTP verified for: ${email}`);
        return res.status(200).json({
          success: true,
          message: 'Email verified successfully. You can now proceed with registration.',
          isRegistrationOTP: true
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid registration OTP'
        });
      }
    }

    // If no registration OTP found, check for existing user OTP
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found and no valid registration OTP'
      });
    }

    // Check if OTP exists and not expired for existing user
    if (!user.emailVerificationOTP || !user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP found. Please request a new one.'
      });
    }

    // Check expiration
    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP for existing user
    if (user.emailVerificationOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // Success - mark email as verified for existing user
    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      isRegistrationOTP: false
    });

  } catch (error) {
    console.error('❌ Verify Email OTP Error:', error);
    next(error);
  }
});

// @desc    Send OTP for mobile verification
// @route   POST /api/auth/send-mobile-otp
// @access  Public
router.post('/send-mobile-otp', mobileOtpLimiter, [
  body('mobile').isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { mobile } = req.body;
    
    // For signup flow, we'll store OTP temporarily even if user doesn't exist yet
    // Check if user exists, if not create a temporary record or use session storage
    let user = await User.findOne({ mobile });
    
    if (!user) {
      // For demo purposes, we'll send OTP even if user doesn't exist
      // In production, you might want to create a temporary verification record
      const otp = process.env.TEST_MODE === 'true' ? '654321' : generateOTP();
      
      console.log(`🧪 TEST MODE - Mobile OTP for ${mobile}: ${otp} (user will be created later)`);
      
      return res.status(200).json({
        success: true,
        message: 'A verification code has been sent to your mobile number.',
        ...(process.env.TEST_MODE === 'true' && { testOtp: otp })
      });
    }

    // User exists - normal flow
    // Check cooldown (reduced for development)
    const cooldownTime = process.env.NODE_ENV === 'development' ? 5000 : 30000; // 5s dev, 30s prod
    if (user.lastOtpSentAt && (new Date() - new Date(user.lastOtpSentAt)) < cooldownTime) {
      const timeLeft = Math.ceil((cooldownTime - (new Date() - new Date(user.lastOtpSentAt))) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${timeLeft} seconds before requesting another OTP.`
      });
    }

    // Generate OTP - use dummy value in test mode
    const otp = process.env.TEST_MODE === 'true' ? '654321' : generateOTP();
    user.mobileVerificationOTP = otp;
    user.mobileVerificationExpires = Date.now() + 10 * 60 * 1000; // 10-minute expiry
    user.lastOtpSentAt = new Date();
    await user.save();

    // In test mode, log the OTP to console
    if (process.env.TEST_MODE === 'true') {
      console.log(`🧪 TEST MODE - Mobile OTP for ${mobile}: ${otp}`);
    }

    // In production, you would send SMS here
    // await sendSMS(mobile, `Your verification code is: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'A verification code has been sent to your mobile number.',
      ...(process.env.TEST_MODE === 'true' && { testOtp: otp }) // Include OTP in response for testing
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Verify mobile OTP
// @route   POST /api/auth/verify-mobile-otp
// @access  Public
router.post('/verify-mobile-otp', mobileOtpLimiter, [
  body('mobile').isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { mobile, otp } = req.body;
    
    // In test mode, accept the dummy OTP even if user doesn't exist yet
    if (process.env.TEST_MODE === 'true' && otp === '654321') {
      return res.status(200).json({
        success: true,
        message: 'Mobile number verified successfully (test mode)'
      });
    }
    
    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please register first.'
      });
    }

    // Check if OTP exists and not expired
    if (!user.mobileVerificationOTP || !user.mobileVerificationExpires) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP found. Please request a new one.'
      });
    }

    // Check expiration
    if (new Date() > user.mobileVerificationExpires) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (user.mobileVerificationOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // Success - mark mobile as verified
    user.mobileVerified = true;
    user.mobileVerificationOTP = undefined;
    user.mobileVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginLimiter, [
  body('identifier').notEmpty().withMessage('Email or mobile is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { identifier, password } = req.body;

    // Check if user exists and include password for comparison
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { mobile: identifier }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed attempts'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Handle failed attempt
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Verify mobile OTP
// @route   POST /api/auth/verify-mobile
// @access  Private
router.post('/verify-mobile', protect, [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { otp } = req.body;
    const user = req.user;

    if (!user.mobileVerificationOTP || !user.mobileVerificationExpires) {
      return res.status(400).json({
        success: false,
        error: 'No OTP found. Please request a new one.'
      });
    }

    if (user.mobileVerificationExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.mobileVerificationOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    user.mobileVerified = true;
    user.mobileVerificationOTP = undefined;
    user.mobileVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Resend mobile OTP
// @route   POST /api/auth/resend-otp
// @access  Private
router.post('/resend-otp', protect, async (req, res, next) => {
  try {
    const user = req.user;

    if (user.mobileVerified) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is already verified'
      });
    }

    // Generate new OTP - use dummy value in test mode
    const mobileOTP = process.env.TEST_MODE === 'true' ? '654321' : generateOTP();
    user.mobileVerificationOTP = mobileOTP;
    user.mobileVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // In test mode or real app, log/send SMS
    if (process.env.TEST_MODE === 'true') {
      console.log(`🧪 TEST MODE - New Mobile OTP for ${user.mobile}: ${mobileOTP}`);
    } else {
      // In a real app, you would send SMS here
      console.log(`New Mobile OTP for ${user.mobile}: ${mobileOTP}`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('kycData')
      .populate('riskProfile')
      .populate('selectedPlan');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        kycStatus: user.kycStatus,
        currentStep: user.currentStep,
        kycSubStep: user.kycSubStep,
        kycSubStepStatus: user.kycSubStepStatus,
        flags: user.flags,
        kycData: user.kycData,
        riskProfile: user.riskProfile,
        selectedPlan: user.selectedPlan,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>You have requested a password reset. Please click the link below to reset your password:</p>
      <a href="${resetUrl}" target="_blank">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: message
      });

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        error: 'Email could not be sent'
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
router.put('/reset-password/:resettoken', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const resetPasswordToken = req.params.resettoken;

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

export default router;