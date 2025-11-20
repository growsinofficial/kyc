import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Basic Transaction Information
  transactionId: {
    type: String,
    required: true,
    uppercase: true
  },
  
  // User and Plan Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  
  // Amount Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  
  // Payment Gateway Information
  paymentGateway: {
    type: String,
    required: true,
    enum: ['zoho', 'razorpay', 'stripe', 'payu', 'ccavenue']
  },
  gatewayTransactionId: String,
  gatewayOrderId: String,
  gatewayPaymentId: String,
  
  // Transaction Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'net_banking', 'upi', 'wallet', 'emi', 'bank_transfer']
  },
  
  // Payment Details (encrypted/masked)
  paymentDetails: {
    cardLast4: String,
    cardType: String,
    bankName: String,
    upiId: String,
    walletName: String
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  cancelledAt: Date,
  
  // Failure Information
  failureReason: String,
  errorCode: String,
  errorMessage: String,
  
  // Refund Information
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    },
    processedAt: Date,
    gatewayRefundId: String
  }],
  
  // Additional Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin'],
      default: 'web'
    },
    campaignCode: String,
    referralCode: String
  },
  
  // Gateway Response (for debugging)
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    select: false // Don't include by default due to size
  },
  
  // Webhook Information
  webhookReceived: {
    type: Boolean,
    default: false
  },
  webhookReceivedAt: Date,
  webhookVerified: {
    type: Boolean,
    default: false
  },
  
  // Reconciliation
  reconciledAt: Date,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reconciliationStatus: {
    type: String,
    enum: ['pending', 'matched', 'discrepancy', 'resolved'],
    default: 'pending'
  },
  
  // Invoice Information
  invoiceNumber: String,
  invoiceUrl: String,
  
  // Retry Information
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryAt: Date,
  
  // Tax Information
  taxDetails: {
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalTax: Number,
    taxableAmount: Number
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ transactionId: 1 }, { unique: true });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ planId: 1, status: 1 });
transactionSchema.index({ status: 1, initiatedAt: 1 });
transactionSchema.index({ gatewayTransactionId: 1 }, { sparse: true });
transactionSchema.index({ paymentGateway: 1, status: 1 });
transactionSchema.index({ reconciliationStatus: 1 });
transactionSchema.index({ webhookReceived: 1 });

// Virtual for total refunded amount
transactionSchema.virtual('totalRefunded').get(function() {
  if (!this.refunds || this.refunds.length === 0) return 0;
  return this.refunds
    .filter(refund => refund.status === 'processed')
    .reduce((total, refund) => total + refund.amount, 0);
});

// Virtual for net amount (after refunds)
transactionSchema.virtual('netAmount').get(function() {
  return this.amount - this.totalRefunded;
});

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  });
  return formatter.format(this.amount);
});

// Method to check if transaction can be retried
transactionSchema.methods.canRetry = function() {
  return this.status === 'failed' && 
         this.retryCount < this.maxRetries && 
         (!this.nextRetryAt || this.nextRetryAt <= new Date());
};

// Method to mark transaction as completed
transactionSchema.methods.markCompleted = function(gatewayData = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.gatewayTransactionId = gatewayData.transactionId || this.gatewayTransactionId;
  this.gatewayPaymentId = gatewayData.paymentId || this.gatewayPaymentId;
  return this.save();
};

// Method to mark transaction as failed
transactionSchema.methods.markFailed = function(reason, errorCode = null, errorMessage = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  
  // Set retry if applicable
  if (this.canRetry()) {
    this.retryCount += 1;
    this.nextRetryAt = new Date(Date.now() + (this.retryCount * 30 * 60 * 1000)); // Exponential backoff
  }
  
  return this.save();
};

// Method to process refund
transactionSchema.methods.processRefund = function(amount, reason = 'User requested') {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed transactions');
  }
  
  const totalRefunded = this.totalRefunded;
  if (totalRefunded + amount > this.amount) {
    throw new Error('Refund amount exceeds transaction amount');
  }
  
  const refund = {
    refundId: `REF_${this.transactionId}_${Date.now()}`,
    amount,
    reason,
    status: 'pending'
  };
  
  this.refunds.push(refund);
  
  // Update transaction status if fully refunded
  if (totalRefunded + amount === this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  
  return this.save();
};

// Static method to generate unique transaction ID
transactionSchema.statics.generateTransactionId = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN_${timestamp}_${random}`;
};

// Static method to get transactions by status
transactionSchema.statics.getByStatus = function(status, limit = 100) {
  return this.find({ status })
    .populate('userId', 'name email mobile')
    .populate('planId', 'name title price')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Pre-save middleware to generate transaction ID
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    this.transactionId = this.constructor.generateTransactionId();
  }
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;