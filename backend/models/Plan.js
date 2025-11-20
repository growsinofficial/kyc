import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  // Plan Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  billingCycle: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly', 'one-time']
  },
  
  // Plan Features
  features: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    included: {
      type: Boolean,
      default: true
    },
    limit: {
      type: String, // e.g., "Unlimited", "Up to 10", etc.
      default: "Included"
    }
  }],
  
  // Investment Limits
  investmentLimits: {
    minimum: {
      type: Number,
      default: 0
    },
    maximum: {
      type: Number,
      default: null // null means unlimited
    },
    recommendedRange: {
      min: Number,
      max: Number
    }
  },
  
  // Risk Profile Compatibility
  riskProfiles: [{
    type: String,
    enum: ['Conservative', 'Moderate', 'Aggressive']
  }],
  
  // Plan Category
  category: {
    type: String,
    required: true,
    enum: ['basic', 'premium', 'enterprise', 'custom']
  },
  
  // Plan Status and Availability
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Availability
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableUntil: Date,
  
  // Marketing
  tagline: String,
  highlights: [String],
  benefits: [String],
  
  // Technical Configuration
  planCode: {
    type: String,
    required: true,
    uppercase: true
  },
  
  // Integration IDs
  zohoPaymentPlanId: String, // Zoho's plan ID
  externalPlanId: String,    // Any other payment gateway plan ID
  
  // Plan Metadata
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Terms and Conditions
  termsAndConditions: String,
  cancellationPolicy: String,
  refundPolicy: String,
  
  // Analytics
  subscriptionCount: {
    type: Number,
    default: 0
  },
  revenueGenerated: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
planSchema.index({ planCode: 1 }, { unique: true });
planSchema.index({ isActive: 1, displayOrder: 1 });
planSchema.index({ category: 1, isActive: 1 });
planSchema.index({ riskProfiles: 1 });
planSchema.index({ price: 1 });

// Virtual for formatted price
planSchema.virtual('formattedPrice').get(function() {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  });
  return formatter.format(this.price);
});

// Virtual for price per month (for comparison)
planSchema.virtual('monthlyEquivalent').get(function() {
  switch (this.billingCycle) {
    case 'monthly':
      return this.price;
    case 'quarterly':
      return this.price / 3;
    case 'yearly':
      return this.price / 12;
    case 'one-time':
      return this.price;
    default:
      return this.price;
  }
});

// Method to check if plan is available
planSchema.methods.isAvailable = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  if (this.availableFrom > now) return false;
  if (this.availableUntil && this.availableUntil < now) return false;
  
  return true;
};

// Method to check if plan is suitable for user's risk profile
planSchema.methods.isSuitableForRiskProfile = function(riskProfile) {
  if (!this.riskProfiles || this.riskProfiles.length === 0) return true;
  return this.riskProfiles.includes(riskProfile);
};

// Static method to get available plans for risk profile
planSchema.statics.getAvailablePlans = function(riskProfile = null) {
  const query = { isActive: true };
  
  // Add date availability check
  const now = new Date();
  query.availableFrom = { $lte: now };
  query.$or = [
    { availableUntil: { $exists: false } },
    { availableUntil: null },
    { availableUntil: { $gte: now } }
  ];
  
  // Add risk profile filter if provided
  if (riskProfile) {
    query.riskProfiles = riskProfile;
  }
  
  return this.find(query).sort({ displayOrder: 1, price: 1 });
};

// Static method to get featured/popular plans
planSchema.statics.getFeaturedPlans = function() {
  return this.find({
    isActive: true,
    $or: [{ isFeatured: true }, { isPopular: true }]
  }).sort({ displayOrder: 1 });
};

// Method to increment subscription count
planSchema.methods.incrementSubscription = function(amount = null) {
  this.subscriptionCount += 1;
  if (amount) {
    this.revenueGenerated += amount;
  }
  return this.save();
};

const Plan = mongoose.model('Plan', planSchema);

export default Plan;