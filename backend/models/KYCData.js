import mongoose from 'mongoose';

const kycDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Personal Information
  personal: {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
      maxlength: [100, 'Father name cannot exceed 100 characters']
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function(value) {
          // Must be at least 18 years old
          const eighteenYearsAgo = new Date();
          eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
          return value <= eighteenYearsAgo;
        },
        message: 'Must be at least 18 years old'
      }
    },
    pan: {
      type: String,
      required: [true, 'PAN number is required'],
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Please enter a valid PAN number']
    },
    aadhar: {
      type: String,
      required: [true, 'Aadhaar number is required'],
      match: [/^[0-9]{12}$/, 'Please enter a valid 12-digit Aadhaar number']
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female', 'Other']
    },
    maritalStatus: {
      type: String,
      required: [true, 'Marital status is required'],
      enum: ['Single', 'Married', 'Divorced', 'Widowed']
    }
  },

  // Address Information
  address: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'India'
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },

  // Professional Information
  professional: {
    occupation: {
      type: String,
      required: [true, 'Occupation is required'],
      enum: [
        'Salaried Employee',
        'Self Employed',
        'Business Owner',
        'Professional',
        'Student',
        'Retired',
        'Homemaker',
        'Others'
      ]
    },
    otherOccupation: {
      type: String,
      trim: true,
      maxlength: [100, 'Other occupation cannot exceed 100 characters']
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      enum: [
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
      ]
    },
    otherIndustry: {
      type: String,
      trim: true,
      maxlength: [100, 'Other industry cannot exceed 100 characters']
    },
    experience: {
      type: String,
      required: [true, 'Experience is required'],
      enum: ['0-2 years', '2-5 years', '5-10 years', '10+ years']
    },
    income: {
      type: String,
      required: [true, 'Income range is required'],
      enum: [
        'Below 3 Lakhs',
        '3-5 Lakhs',
        '5-10 Lakhs',
        '10-25 Lakhs',
        '25-50 Lakhs',
        'Above 50 Lakhs'
      ]
    }
  },

  // Verification Status
  verificationStatus: {
    personal: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    address: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    professional: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },

  // Admin Notes
  adminNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Submission and Review Dates
  submittedAt: Date,
  reviewedAt: Date,
  approvedAt: Date,
  rejectedAt: Date
}, {
  timestamps: true
});

// Indexes
kycDataSchema.index({ userId: 1 }, { unique: true });
kycDataSchema.index({ 'personal.pan': 1 }, { unique: true, sparse: true });
kycDataSchema.index({ 'personal.aadhar': 1 }, { unique: true, sparse: true });
kycDataSchema.index({ 'verificationStatus.personal': 1 });
kycDataSchema.index({ 'verificationStatus.address': 1 });
kycDataSchema.index({ 'verificationStatus.professional': 1 });
kycDataSchema.index({ submittedAt: 1 });

// Validation: Other occupation required when occupation is 'Others'
kycDataSchema.pre('save', function(next) {
  if (this.professional.occupation === 'Others' && !this.professional.otherOccupation) {
    return next(new Error('Other occupation details required when occupation is Others'));
  }
  
  if (this.professional.industry === 'Others' && !this.professional.otherIndustry) {
    return next(new Error('Other industry details required when industry is Others'));
  }
  
  next();
});

const KYCData = mongoose.model('KYCData', kycDataSchema);

export default KYCData;