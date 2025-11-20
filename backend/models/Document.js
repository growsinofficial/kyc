import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Document Information
  documentType: {
    type: String,
    required: true,
    enum: ['pan', 'aadhaar-front', 'aadhaar-back', 'profile', 'bank-statement', 'income-proof', 'signature', 'agreement']
  },
  documentName: {
    type: String,
    required: true,
    trim: true
  },
  
  // File Storage Information
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  storageType: {
    type: String,
    enum: ['database'],
    default: 'database'
  },
  filePath: {
    type: String
  },
  fileData: {
    type: Buffer,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    max: [10485760, 'File size cannot exceed 10MB'] // 10MB in bytes
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  },
  
  // Document Validation
  validationStatus: {
    type: String,
    enum: ['pending', 'processing', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  
  // OCR/AI Extracted Data
  extractedData: {
    // For PAN Card
    panNumber: String,
    panName: String,
    panFatherName: String,
    panDateOfBirth: Date,
    
    // For Aadhaar Card
    aadhaarNumber: String,
    aadhaarName: String,
    aadhaarAddress: String,
    aadhaarDateOfBirth: Date,
    aadhaarGender: String,
    
    // Validation Confidence Score (0-100)
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // Face Match Score (for profile verification)
    faceMatchScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Validation Results
  validationResults: {
    documentQuality: {
      type: String,
      enum: ['poor', 'fair', 'good', 'excellent']
    },
    textClarity: {
      type: String,
      enum: ['poor', 'fair', 'good', 'excellent']
    },
    isOriginal: Boolean,
    isTampered: Boolean,
    expiryDate: Date,
    validationErrors: [String],
    validationWarnings: [String]
  },
  
  // Manual Review
  reviewStatus: {
    type: String,
    enum: ['not_required', 'pending', 'in_progress', 'completed'],
    default: 'not_required'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  reviewDecision: {
    type: String,
    enum: ['approve', 'reject', 'request_reupload']
  },
  
  // Processing Metadata
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  verifiedAt: Date,
  rejectedAt: Date,
  
  // Version Control (for re-uploads)
  version: {
    type: Number,
    default: 1
  },
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Security
  checksum: String, // File hash for integrity verification
  encryptionKey: String, // If file is encrypted
  
  // Additional Metadata
  uploadSource: {
    type: String,
    enum: ['web', 'mobile', 'admin'],
    default: 'web'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes
documentSchema.index({ userId: 1, documentType: 1 });
documentSchema.index({ validationStatus: 1 });
documentSchema.index({ reviewStatus: 1 });
documentSchema.index({ uploadedAt: 1 });
documentSchema.index({ fileName: 1 }, { unique: true });
documentSchema.index({ isActive: 1 });

// Compound index for finding latest version of a document
documentSchema.index({ userId: 1, documentType: 1, version: -1, isActive: 1 });

// Virtual for file URL (assuming you'll serve files from a specific endpoint)
documentSchema.virtual('fileUrl').get(function() {
  return `/api/documents/${this._id.toString()}/download`;
});

// Method to mark document as replaced
documentSchema.methods.markAsReplaced = function(newDocumentId) {
  this.isActive = false;
  this.replacedBy = newDocumentId;
  return this.save();
};

// Method to check if document needs manual review
documentSchema.methods.needsManualReview = function() {
  if (this.validationStatus === 'rejected') return true;
  if (this.extractedData && this.extractedData.confidenceScore < 70) return true;
  if (this.validationResults && this.validationResults.validationErrors && 
      this.validationResults.validationErrors.length > 0) return true;
  return false;
};

// Static method to get latest document by type for user
documentSchema.statics.getLatestByType = function(userId, documentType) {
  return this.findOne({
    userId,
    documentType,
    isActive: true
  }).sort({ version: -1, createdAt: -1 });
};

// Static method to get all active documents for user
documentSchema.statics.getActiveDocuments = function(userId) {
  return this.find({
    userId,
    isActive: true
  }).sort({ documentType: 1, version: -1 });
};

// Pre-save middleware to handle version increment
documentSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Find the latest version for this user and document type
    const latestDoc = await this.constructor.findOne({
      userId: this.userId,
      documentType: this.documentType,
      isActive: true
    }).sort({ version: -1 });
    
    if (latestDoc) {
      this.version = latestDoc.version + 1;
      // Mark the previous document as inactive
      await latestDoc.markAsReplaced(this._id);
    }
  }
  next();
});

const Document = mongoose.model('Document', documentSchema);

export default Document;