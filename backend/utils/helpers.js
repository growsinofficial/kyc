import crypto from 'crypto';

// Generate random OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

// Generate unique filename
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = originalName.split('.').pop();
  return `${timestamp}_${random}.${ext}`;
};

// Validate PAN number
const validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return panRegex.test(pan);
};

// Validate Aadhaar number
const validateAadhaar = (aadhaar) => {
  const aadhaarRegex = /^[0-9]{12}$/;
  return aadhaarRegex.test(aadhaar);
};

// Validate Indian mobile number
const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9][0-9]{9}$/;
  return mobileRegex.test(mobile);
};

// Validate email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate pincode
const validatePincode = (pincode) => {
  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
};

// Generate transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TXN_${timestamp}_${random}`;
};

// Calculate age from date of birth
const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Validate minimum age (18 years)
const isAdult = (dob) => {
  return calculateAge(dob) >= 18;
};

// Format currency (Indian Rupees)
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Sanitize filename for storage
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

// Generate secure hash
const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Verify hash
const verifyHash = (data, hash) => {
  return generateHash(data) === hash;
};

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Mask sensitive data
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2 
    ? username.slice(0, 2) + '*'.repeat(username.length - 2)
    : '*'.repeat(username.length);
  return `${maskedUsername}@${domain}`;
};

const maskMobile = (mobile) => {
  return mobile.length > 4 
    ? '*'.repeat(mobile.length - 4) + mobile.slice(-4)
    : '*'.repeat(mobile.length);
};

const maskPAN = (pan) => {
  return pan.length > 4 
    ? pan.slice(0, 2) + '*'.repeat(pan.length - 4) + pan.slice(-2)
    : '*'.repeat(pan.length);
};

const maskAadhaar = (aadhaar) => {
  return aadhaar.length > 4 
    ? '*'.repeat(aadhaar.length - 4) + aadhaar.slice(-4)
    : '*'.repeat(aadhaar.length);
};

// Check if file type is allowed
const isAllowedFileType = (mimeType) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf'
  ];
  return allowedTypes.includes(mimeType);
};

// Convert bytes to human readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate file size
const isValidFileSize = (size, maxSize = 10 * 1024 * 1024) => { // 10MB default
  return size <= maxSize;
};

// Generate pagination metadata
const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

// Delay function for testing/simulation
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract file extension
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

// Check if string is valid JSON
const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export {
  generateOTP,
  generateUniqueFilename,
  validatePAN,
  validateAadhaar,
  validateMobile,
  validateEmail,
  validatePincode,
  generateTransactionId,
  calculateAge,
  isAdult,
  formatCurrency,
  sanitizeFilename,
  generateHash,
  verifyHash,
  generateRandomString,
  maskEmail,
  maskMobile,
  maskPAN,
  maskAadhaar,
  isAllowedFileType,
  formatFileSize,
  isValidFileSize,
  getPaginationMeta,
  delay,
  getFileExtension,
  isValidJSON
};