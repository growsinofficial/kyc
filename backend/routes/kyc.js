import express from 'express';
import { body, validationResult } from 'express-validator';
import { User, KYCData } from '../models/index.js';
import { protect } from '../middleware/auth.js';
import { 
  validatePAN, 
  validateAadhaar, 
  validateMobile, 
  validateEmail, 
  validatePincode,
  isAdult 
} from '../utils/helpers.js';

const router = express.Router();

// @desc    Get user's KYC data
// @route   GET /api/kyc
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const kycData = await KYCData.findOne({ userId: req.user._id });
    
    if (!kycData) {
      return res.status(200).json({
        success: true,
        kycData: null,
        message: 'No KYC data found'
      });
    }

    res.status(200).json({
      success: true,
      kycData
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Save/Update personal information
// @route   POST /api/kyc/personal
// @access  Private
router.post('/personal', protect, [
  body('name').notEmpty().withMessage('Full name is required'),
  body('fatherName').notEmpty().withMessage("Father's name is required"),
  body('dob').isISO8601().withMessage('Valid date of birth is required'),
  body('pan').custom((value) => {
    if (!validatePAN(value)) {
      throw new Error('Invalid PAN number format');
    }
    return true;
  }),
  body('aadhar').custom((value) => {
    if (!validateAadhaar(value)) {
      throw new Error('Invalid Aadhaar number format');
    }
    return true;
  }),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('maritalStatus').isIn(['Single', 'Married', 'Divorced', 'Widowed']).withMessage('Invalid marital status')
], async (req, res, next) => {
  try {
    console.log('🔍 KYC Personal endpoint hit:', req.body);
    console.log('🔍 User ID:', req.user._id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, fatherName, dob, pan, aadhar, gender, maritalStatus } = req.body;

    // Check if user is at least 18 years old
    if (!isAdult(dob)) {
      console.log('❌ Age validation failed for DOB:', dob);
      return res.status(400).json({
        success: false,
        error: 'You must be at least 18 years old'
      });
    }

    // Check for duplicate PAN (excluding current user)
    console.log('🔍 Checking PAN uniqueness for:', pan.toUpperCase());
    const existingPAN = await KYCData.findOne({
      'personal.pan': pan.toUpperCase(),
      userId: { $ne: req.user._id }
    });

    if (existingPAN) {
      console.log('❌ Duplicate PAN found:', existingPAN.userId);
      return res.status(400).json({
        success: false,
        error: 'PAN number already exists in our records'
      });
    }

    // Check for duplicate Aadhaar (excluding current user)
    console.log('🔍 Checking Aadhaar uniqueness for:', aadhar);
    const existingAadhaar = await KYCData.findOne({
      'personal.aadhar': aadhar,
      userId: { $ne: req.user._id }
    });

    if (existingAadhaar) {
      console.log('❌ Duplicate Aadhaar found:', existingAadhaar.userId);
      return res.status(400).json({
        success: false,
        error: 'Aadhaar number already exists in our records'
      });
    }

    const personalData = {
      name,
      fatherName,
      dob: new Date(dob),
      pan: pan.toUpperCase(),
      aadhar,
      gender,
      maritalStatus
    };

    // Find existing KYC data or create new
    let kycData = await KYCData.findOne({ userId: req.user._id });

    if (kycData) {
      // Update existing KYC data
      kycData.personal = personalData;
      kycData.verificationStatus.personal = 'pending';
      await kycData.save();
      console.log('✅ Updated existing KYC personal data');
    } else {
      // Create new KYC data with partial validation bypass
      // Use findOneAndUpdate with upsert to avoid Mongoose required field validation
      kycData = await KYCData.findOneAndUpdate(
        { userId: req.user._id },
        {
          $set: {
            userId: req.user._id,
            personal: personalData,
            'verificationStatus.personal': 'pending'
          },
          $setOnInsert: {
            'verificationStatus.address': 'pending',
            'verificationStatus.professional': 'pending'
          }
        },
        { 
          new: true, 
          upsert: true,
          runValidators: false // Skip validation to allow partial document
        }
      );
      console.log('✅ Created new KYC record with personal data');
    }

    // Update user's KYC reference and name
    await User.findByIdAndUpdate(req.user._id, {
      kycData: kycData._id,
      name: name // Update user's name to match KYC
    });

    res.status(200).json({
      success: true,
      message: 'Personal information saved successfully',
      kycData: kycData.personal
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Save/Update address information
// @route   POST /api/kyc/address
// @access  Private
router.post('/address', protect, [
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('pincode').custom((value) => {
    if (!validatePincode(value)) {
      throw new Error('Invalid pincode format');
    }
    return true;
  }),
  body('state').notEmpty().withMessage('State is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('mobile').custom((value) => {
    if (!validateMobile(value)) {
      throw new Error('Invalid mobile number format');
    }
    return true;
  }),
  body('email').custom((value) => {
    if (!validateEmail(value)) {
      throw new Error('Invalid email format');
    }
    return true;
  })
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

    const { address, city, pincode, state, country, mobile, email } = req.body;

    const addressData = {
      address,
      city,
      pincode,
      state,
      country,
      mobile,
      email: email.toLowerCase()
    };

    // Find existing KYC data or create new
    let kycData = await KYCData.findOne({ userId: req.user._id });

    if (!kycData) {
      return res.status(400).json({
        success: false,
        error: 'Please complete personal information first'
      });
    }

    kycData.address = addressData;
    kycData.verificationStatus.address = 'pending';
    await kycData.save();

    res.status(200).json({
      success: true,
      message: 'Address information saved successfully',
      kycData: kycData.address
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Save/Update professional information
// @route   POST /api/kyc/professional
// @access  Private
router.post('/professional', protect, [
  body('occupation').isIn([
    'Salaried Employee',
    'Self Employed', 
    'Business Owner',
    'Professional',
    'Student',
    'Retired',
    'Homemaker',
    'Others'
  ]).withMessage('Invalid occupation'),
  body('industry').isIn([
    'Information Technology',
    'Banking & Finance',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Retail',
    'Real Estate',
    'Government',
    'Agriculture',
    'Others'
  ]).withMessage('Invalid industry'),
  body('experience').isIn([
    '0-2 years',
    '2-5 years', 
    '5-10 years',
    '10+ years'
  ]).withMessage('Invalid experience'),
  body('income').isIn([
    'Below 3 Lakhs',
    '3-5 Lakhs',
    '5-10 Lakhs',
    '10-25 Lakhs',
    '25-50 Lakhs',
    'Above 50 Lakhs'
  ]).withMessage('Invalid income range')
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

    const { occupation, otherOccupation, industry, otherIndustry, experience, income } = req.body;

    // Validate that other fields are provided when "Others" is selected
    if (occupation === 'Others' && !otherOccupation) {
      return res.status(400).json({
        success: false,
        error: 'Please specify other occupation details'
      });
    }

    if (industry === 'Others' && !otherIndustry) {
      return res.status(400).json({
        success: false,
        error: 'Please specify other industry details'
      });
    }

    const professionalData = {
      occupation,
      otherOccupation: occupation === 'Others' ? otherOccupation : undefined,
      industry,
      otherIndustry: industry === 'Others' ? otherIndustry : undefined,
      experience,
      income
    };

    // Find existing KYC data
    let kycData = await KYCData.findOne({ userId: req.user._id });

    if (!kycData) {
      return res.status(400).json({
        success: false,
        error: 'Please complete personal and address information first'
      });
    }

    kycData.professional = professionalData;
    kycData.verificationStatus.professional = 'pending';
    await kycData.save();

    res.status(200).json({
      success: true,
      message: 'Professional information saved successfully',
      kycData: kycData.professional
    });
  } catch (error) {
    next(error);
  }
});

const OCCUPATIONS = ['Salaried Employee', 'Self Employed', 'Business Owner', 'Professional', 'Student', 'Retired', 'Homemaker', 'Others'];
const INDUSTRIES = ['Information Technology', 'Banking & Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Real Estate', 'Government', 'Agriculture', 'Others'];
const EXPERIENCE = ['0-2 years', '2-5 years', '5-10 years', '10+ years'];
const INCOME = ['Below 3 Lakhs', '3-5 Lakhs', '5-10 Lakhs', '10-25 Lakhs', '25-50 Lakhs', 'Above 50 Lakhs'];

// @desc    Save all client details in one step (personal + address + professional)
//          and submit KYC. Used by the single "Client details" screen.
// @route   POST /api/kyc/details
// @access  Private
router.post('/details', protect, [
  body('personal.name').trim().notEmpty().withMessage('Full name is required'),
  body('personal.fatherName').trim().notEmpty().withMessage("Father's name is required"),
  body('personal.dob').isISO8601().withMessage('Valid date of birth is required'),
  body('personal.pan').customSanitizer((v) => String(v || '').toUpperCase().replace(/\s/g, ''))
    .custom((v) => validatePAN(v)).withMessage('PAN must be 5 letters, 4 digits and 1 letter'),
  body('personal.aadhar').customSanitizer((v) => String(v || '').replace(/\D/g, ''))
    .custom((v) => validateAadhaar(v)).withMessage('Aadhaar must have 12 digits'),
  body('personal.gender').isIn(['Male', 'Female', 'Other']).withMessage('Select a gender'),
  body('personal.maritalStatus').isIn(['Single', 'Married', 'Divorced', 'Widowed']).withMessage('Select a marital status'),
  body('address.address').trim().notEmpty().withMessage('Address is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.country').optional().trim(),
  body('address.pincode').custom((v) => validatePincode(String(v || ''))).withMessage('PIN code must have 6 digits'),
  body('address.mobile').customSanitizer((v) => String(v || '').replace(/\D/g, '').slice(-10))
    .custom((v) => validateMobile(v)).withMessage('Enter a 10-digit mobile number'),
  body('address.email').custom((v) => validateEmail(String(v || ''))).withMessage('Enter a valid email address'),
  body('professional.occupation').isIn(OCCUPATIONS).withMessage('Select an occupation'),
  body('professional.industry').isIn(INDUSTRIES).withMessage('Select an industry'),
  body('professional.experience').isIn(EXPERIENCE).withMessage('Select your experience'),
  body('professional.income').isIn(INCOME).withMessage('Select an income range'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg, details: errors.array() });
    }
    const { personal, address, professional } = req.body;

    if (!isAdult(personal.dob)) {
      return res.status(400).json({ success: false, error: 'You must be at least 18 years old' });
    }
    const duplicate = await KYCData.findOne({
      userId: { $ne: req.user._id },
      $or: [{ 'personal.pan': personal.pan }, { 'personal.aadhar': personal.aadhar }],
    }).select('personal.pan');
    if (duplicate) {
      const field = duplicate.personal?.pan === personal.pan ? 'PAN' : 'Aadhaar number';
      return res.status(400).json({ success: false, error: `This ${field} is already registered with another account` });
    }

    const data = {
      personal: {
        name: personal.name.trim(),
        fatherName: personal.fatherName.trim(),
        dob: new Date(personal.dob),
        pan: personal.pan,
        aadhar: personal.aadhar,
        gender: personal.gender,
        maritalStatus: personal.maritalStatus,
      },
      address: {
        address: address.address.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        country: (address.country || 'India').trim(),
        pincode: String(address.pincode),
        mobile: address.mobile,
        email: String(address.email).toLowerCase().trim(),
      },
      professional: {
        occupation: professional.occupation,
        otherOccupation: professional.occupation === 'Others' ? professional.otherOccupation || 'Other' : undefined,
        industry: professional.industry,
        otherIndustry: professional.industry === 'Others' ? professional.otherIndustry || 'Other' : undefined,
        experience: professional.experience,
        income: professional.income,
      },
    };

    let kycData = await KYCData.findOne({ userId: req.user._id });
    if (!kycData) kycData = new KYCData({ userId: req.user._id });
    kycData.set(data);
    kycData.verificationStatus = { personal: 'pending', address: 'pending', professional: 'pending' };
    kycData.submittedAt = new Date();
    await kycData.save();

    await User.findByIdAndUpdate(req.user._id, {
      kycData: kycData._id,
      name: data.personal.name,
      kycStatus: 'pending_review',
    });

    res.status(200).json({ success: true, message: 'Client details saved', kyc: kycData });
  } catch (error) {
    next(error);
  }
});

// @desc    Submit KYC for review
// @route   POST /api/kyc/submit
// @access  Private
router.post('/submit', protect, async (req, res, next) => {
  try {
    const kycData = await KYCData.findOne({ userId: req.user._id });

    if (!kycData) {
      return res.status(400).json({
        success: false,
        error: 'No KYC data found. Please complete all steps first.'
      });
    }

    // Check if all sections are completed
    if (!kycData.personal || !kycData.address || !kycData.professional) {
      return res.status(400).json({
        success: false,
        error: 'Please complete all KYC sections before submitting'
      });
    }

    // Update submission timestamp and status
    kycData.submittedAt = new Date();
    await kycData.save();

    // Update user's KYC status
    await User.findByIdAndUpdate(req.user._id, {
      kycStatus: 'pending_review',
      currentStep: 'risk' // Move to next step after KYC submission
    });

    res.status(200).json({
      success: true,
      message: 'KYC information submitted successfully for review'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user's current step and substep
// @route   POST /api/kyc/update-progress
// @access  Private
router.post('/update-progress', protect, [
  body('kycSubStep').isInt({ min: 1, max: 4 }).withMessage('Invalid KYC substep'),
  body('kycSubStepStatus').isObject().withMessage('Invalid substep status')
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

    const { kycSubStep, kycSubStepStatus } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      kycSubStep,
      kycSubStepStatus
    });

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get existing KYC data for form restoration
// @route   GET /api/kyc/data
// @access  Private
router.get('/data', protect, async (req, res, next) => {
  try {
    const kycData = await KYCData.findOne({ userId: req.user._id });
    
    if (!kycData) {
      return res.status(200).json({
        success: true,
        message: 'No KYC data found',
        data: {
          personal: {},
          address: {},
          professional: {},
          verificationStatus: {
            personal: 'pending',
            address: 'pending',
            professional: 'pending'
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'KYC data retrieved successfully',
      data: {
        personal: kycData.personal || {},
        address: kycData.address || {},
        professional: kycData.professional || {},
        verificationStatus: kycData.verificationStatus || {
          personal: 'pending',
          address: 'pending',
          professional: 'pending'
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get KYC status
// @route   GET /api/kyc/status
// @access  Private
router.get('/status', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('kycData');

    const status = {
      kycStatus: user.kycStatus,
      currentStep: user.currentStep,
      kycSubStep: user.kycSubStep,
      kycSubStepStatus: user.kycSubStepStatus,
      emailVerified: user.emailVerified,
      mobileVerified: user.mobileVerified,
      completedSections: {
        personal: !!(user.kycData?.personal),
        address: !!(user.kycData?.address),
        professional: !!(user.kycData?.professional)
      },
      submittedAt: user.kycData?.submittedAt,
      approvedAt: user.kycApprovedAt
    };

    res.status(200).json({
      success: true,
      status
    });
  } catch (error) {
    next(error);
  }
});

export default router;