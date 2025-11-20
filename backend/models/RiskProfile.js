import mongoose from 'mongoose';

const riskProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Risk Assessment Answers
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Calculated Risk Score
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  // Risk Category
  riskCategory: {
    type: String,
    required: true,
    enum: ['Conservative', 'Moderate', 'Aggressive']
  },

  // Detailed Risk Breakdown
  riskBreakdown: {
    ageScore: { type: Number, default: 0 },
    incomeScore: { type: Number, default: 0 },
    experienceScore: { type: Number, default: 0 },
    objectiveScore: { type: Number, default: 0 },
    timeHorizonScore: { type: Number, default: 0 },
    riskToleranceScore: { type: Number, default: 0 }
  },

  // Investment Recommendations
  recommendations: {
    equityAllocation: {
      type: Number,
      min: 0,
      max: 100
    },
    debtAllocation: {
      type: Number,
      min: 0,
      max: 100
    },
    alternativeAllocation: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    riskCapacity: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    investmentHorizon: {
      type: String,
      enum: ['Short Term', 'Medium Term', 'Long Term']
    }
  },

  // Additional Insights
  insights: {
    investorType: {
      type: String,
      enum: ['Conservative Investor', 'Balanced Investor', 'Growth Investor', 'Aggressive Investor']
    },
    riskTolerance: {
      type: String,
      enum: ['Very Low', 'Low', 'Moderate', 'High', 'Very High']
    },
    suggestedProducts: [String]
  },

  // Assessment Metadata
  assessmentVersion: {
    type: String,
    default: '1.0'
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: function() {
      // Valid for 1 year
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Review Status
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'requires_review'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String
}, {
  timestamps: true
});

// Indexes
riskProfileSchema.index({ userId: 1 }, { unique: true });
riskProfileSchema.index({ riskCategory: 1 });
riskProfileSchema.index({ riskScore: 1 });
riskProfileSchema.index({ completedAt: 1 });
riskProfileSchema.index({ validUntil: 1 });

// Virtual for checking if assessment is expired
riskProfileSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date();
});

// Method to calculate risk score based on answers
riskProfileSchema.methods.calculateRiskScore = function() {
  let totalScore = 0;
  const answers = this.answers;
  
  // Age scoring (younger = higher risk tolerance)
  const ageAnswer = answers.get('age');
  if (ageAnswer === 0) totalScore += 25; // < 40
  else if (ageAnswer === 1) totalScore += 20; // 40-50
  else if (ageAnswer === 2) totalScore += 15; // 51-60
  else if (ageAnswer === 3) totalScore += 10; // > 60
  
  // Income scoring
  const incomeAnswer = answers.get('income');
  if (incomeAnswer === 0) totalScore += 10; // < 10L
  else if (incomeAnswer === 1) totalScore += 15; // 10-50L
  else if (incomeAnswer === 2) totalScore += 20; // 50L-1Cr
  else if (incomeAnswer === 3) totalScore += 25; // > 1Cr
  
  // Investment percentage scoring
  const investAnswer = answers.get('invest_percent');
  if (investAnswer === 0) totalScore += 10; // < 20%
  else if (investAnswer === 1) totalScore += 15; // 20-50%
  else if (investAnswer === 2) totalScore += 20; // > 50%
  
  // Liability percentage scoring (inverse)
  const liabilityAnswer = answers.get('liability_percent');
  if (liabilityAnswer === 0) totalScore += 20; // < 20%
  else if (liabilityAnswer === 1) totalScore += 15; // 20-50%
  else if (liabilityAnswer === 2) totalScore += 10; // > 50%
  
  // Outcome preference scoring
  const outcomeAnswer = answers.get('outcome');
  if (outcomeAnswer === 0) totalScore += 5; // Capital Protection
  else if (outcomeAnswer === 1) totalScore += 15; // Average Returns
  else if (outcomeAnswer === 2) totalScore += 25; // High Returns
  
  this.riskScore = Math.min(100, totalScore);
  
  // Determine risk category
  if (this.riskScore <= 40) {
    this.riskCategory = 'Conservative';
  } else if (this.riskScore <= 70) {
    this.riskCategory = 'Moderate';
  } else {
    this.riskCategory = 'Aggressive';
  }
  
  return this.riskScore;
};

// Method to generate recommendations
riskProfileSchema.methods.generateRecommendations = function() {
  const score = this.riskScore;
  
  if (score <= 40) {
    // Conservative
    this.recommendations = {
      equityAllocation: 20,
      debtAllocation: 80,
      alternativeAllocation: 0,
      riskCapacity: 'Low',
      investmentHorizon: 'Short Term'
    };
    this.insights = {
      investorType: 'Conservative Investor',
      riskTolerance: 'Low',
      suggestedProducts: ['Fixed Deposits', 'Government Bonds', 'Conservative Mutual Funds']
    };
  } else if (score <= 70) {
    // Moderate
    this.recommendations = {
      equityAllocation: 50,
      debtAllocation: 45,
      alternativeAllocation: 5,
      riskCapacity: 'Medium',
      investmentHorizon: 'Medium Term'
    };
    this.insights = {
      investorType: 'Balanced Investor',
      riskTolerance: 'Moderate',
      suggestedProducts: ['Balanced Mutual Funds', 'Blue Chip Stocks', 'Corporate Bonds']
    };
  } else {
    // Aggressive
    this.recommendations = {
      equityAllocation: 80,
      debtAllocation: 15,
      alternativeAllocation: 5,
      riskCapacity: 'High',
      investmentHorizon: 'Long Term'
    };
    this.insights = {
      investorType: 'Growth Investor',
      riskTolerance: 'High',
      suggestedProducts: ['Equity Mutual Funds', 'Small Cap Stocks', 'ELSS Funds']
    };
  }
};

const RiskProfile = mongoose.model('RiskProfile', riskProfileSchema);

export default RiskProfile;