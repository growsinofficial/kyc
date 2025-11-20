import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Role
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },

  // Verification Status
  emailVerified: {
    type: Boolean,
    default: false
  },
  mobileVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  mobileVerificationOTP: String,
  mobileVerificationExpires: Date,
  lastOtpSentAt: Date,

  // Account Security
  isActive: {
    type: Boolean,
    default: true
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // KYC Status
  kycStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'pending_review', 'approved', 'rejected'],
    default: 'not_started'
  },
  kycCompletedAt: Date,
  kycApprovedAt: Date,

  // Current Step Tracking
  currentStep: {
    type: String,
    enum: ['auth', 'kyc', 'risk', 'assessment', 'docs', 'plan', 'sign', 'payment'],
    default: 'auth'
  },
  kycSubStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },
  kycSubStepStatus: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending'
  },

  // Process Flags
  flags: {
    riskCompleted: { type: Boolean, default: false },
    assessmentAck: { type: Boolean, default: false },
    agreementSigned: { type: Boolean, default: false },
    paymentDone: { type: Boolean, default: false }
  },

  // Zoho Books Integration
  zohoBooksCustomerId: {
    type: String,
    default: null
  },
  zohoBooksSyncedAt: {
    type: Date,
    default: null
  },
  zohoBooksSyncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending'
  },

  // Payment Session Tracking
  paymentSessions: [{
    sessionId: {
      type: String,
      required: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    paymentId: String,
    paymentMethod: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date
  }],

  // Subscription info (set during payment success)
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'active', 'cancelled', 'expired'],
    default: 'inactive'
  },
  planPurchasedAt: Date,

  // References to other collections
  kycData: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KYCData'
  },
  riskProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskProfile'
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  selectedPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ mobile: 1 }, { unique: true });
userSchema.index({ kycStatus: 1 });
userSchema.index({ currentStep: 1 });
userSchema.index({ createdAt: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we hit max attempts and it's not locked already, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

const User = mongoose.model('User', userSchema);

export default User;