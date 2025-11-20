import { kycZohoIntegration } from '../services/kycZohoIntegration.js';

// Middleware to automatically sync KYC status changes to Zoho Books
export const syncToZohoBooks = async (req, res, next) => {
  try {
    // Store original res.json to intercept the response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Call the original json method first
      originalJson.call(this, data);
      
      // If the response was successful and involves KYC status change
      if (data.success && req.body && (req.body.kycStatus || req.body.status)) {
        // Async sync to Zoho Books (don't wait for it to complete)
        setImmediate(async () => {
          try {
            let userId = req.params.userId || req.params.id || req.user?.id;
            
            // If no userId in params, try to get from request body
            if (!userId && req.body.userId) {
              userId = req.body.userId;
            }
            
            if (userId) {
              console.log(`🔄 Auto-syncing user ${userId} to Zoho Books after KYC status change`);
              
              // Determine sync type based on the endpoint and status
              if (req.path.includes('kyc') && data.data && data.data.kycStatus === 'approved') {
                // KYC completed
                await kycZohoIntegration.handleKYCCompletion(userId);
              } else if (req.path.includes('kyc') && data.data && data.data.kycStatus === 'rejected') {
                // KYC rejected
                const rejectionReason = req.body.rejectionReason || 'KYC documents did not meet requirements';
                await kycZohoIntegration.handleKYCRejection(userId, rejectionReason);
              } else {
                // General sync
                await kycZohoIntegration.syncUserToZohoBooks(userId);
              }
              
              console.log(`✅ Auto-sync to Zoho Books completed for user ${userId}`);
            }
          } catch (error) {
            console.error(`❌ Auto-sync to Zoho Books failed:`, error.message);
            // Don't throw error - this is a background operation
          }
        });
      }
    };
    
    next();
  } catch (error) {
    console.error('❌ Zoho Books sync middleware error:', error);
    next(); // Continue with the request even if middleware fails
  }
};

// Middleware specifically for payment recording
export const recordPaymentInZoho = async (req, res, next) => {
  try {
    // Store original res.json to intercept the response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Call the original json method first
      originalJson.call(this, data);
      
      // If payment was successful
      if (data.success && req.body && req.body.amount) {
        // Async record payment in Zoho Books
        setImmediate(async () => {
          try {
            let userId = req.params.userId || req.params.id || req.user?.id;
            
            if (userId) {
              console.log(`💰 Auto-recording payment in Zoho Books for user ${userId}`);
              
              const paymentDetails = {
                amount: req.body.amount,
                method: req.body.paymentMethod || req.body.method || 'online',
                transactionId: req.body.transactionId || req.body.referenceId || data.data?.transactionId,
                description: req.body.description || 'Payment received via KYC Platform',
                invoiceId: req.body.invoiceId || data.data?.invoiceId
              };
              
              await kycZohoIntegration.recordPayment(userId, paymentDetails);
              console.log(`✅ Payment recorded in Zoho Books for user ${userId}`);
            }
          } catch (error) {
            console.error(`❌ Auto-record payment in Zoho Books failed:`, error.message);
            // Don't throw error - this is a background operation
          }
        });
      }
    };
    
    next();
  } catch (error) {
    console.error('❌ Zoho Books payment recording middleware error:', error);
    next(); // Continue with the request even if middleware fails
  }
};

// Middleware to sync user registration to Zoho Books
export const syncNewUserToZoho = async (req, res, next) => {
  try {
    // Store original res.json to intercept the response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Call the original json method first
      originalJson.call(this, data);
      
      // If user registration was successful
      if (data.success && data.user && req.path.includes('register')) {
        // Async sync new user to Zoho Books
        setImmediate(async () => {
          try {
            const userId = data.user.id;
            console.log(`👤 Auto-syncing new user ${userId} to Zoho Books`);
            
            await kycZohoIntegration.syncUserToZohoBooks(userId);
            console.log(`✅ New user synced to Zoho Books: ${userId}`);
          } catch (error) {
            console.error(`❌ Auto-sync new user to Zoho Books failed:`, error.message);
            // Don't throw error - this is a background operation
          }
        });
      }
    };
    
    next();
  } catch (error) {
    console.error('❌ Zoho Books new user sync middleware error:', error);
    next(); // Continue with the request even if middleware fails
  }
};