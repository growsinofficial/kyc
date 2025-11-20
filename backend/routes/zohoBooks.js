import express from 'express';
import { protect } from '../middleware/auth.js';
import { kycZohoIntegration } from '../services/kycZohoIntegration.js';
import { zohoBooksService } from '../utils/zohoBooks.js';
import { User } from '../models/index.js';

const router = express.Router();

// @desc    Sync single user to Zoho Books
// @route   POST /api/zoho/sync-user/:userId
// @access  Private (Admin)
router.post('/sync-user/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔄 Manual sync request for user: ${userId}`);
    
    const zohoCustomer = await kycZohoIntegration.syncUserToZohoBooks(userId);
    
    res.status(200).json({
      success: true,
      message: 'User synced to Zoho Books successfully',
      data: {
        zohoCustomerId: zohoCustomer.contact_id,
        customerName: zohoCustomer.contact_name
      }
    });
  } catch (error) {
    console.error('❌ Sync user error:', error);
    next(error);
  }
});

// @desc    Sync all users to Zoho Books
// @route   POST /api/zoho/sync-all-users
// @access  Private (Admin)
router.post('/sync-all-users', protect, async (req, res, next) => {
  try {
    console.log('🔄 Bulk sync all users to Zoho Books');
    
    const results = await kycZohoIntegration.syncAllUsersToZohoBooks();
    
    res.status(200).json({
      success: true,
      message: 'Bulk sync completed',
      data: results
    });
  } catch (error) {
    console.error('❌ Bulk sync error:', error);
    next(error);
  }
});

// @desc    Handle KYC completion with Zoho Books integration
// @route   POST /api/zoho/kyc-completed/:userId
// @access  Private
router.post('/kyc-completed/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { planDetails } = req.body;
    
    console.log(`🎉 KYC completion handling for user: ${userId}`);
    
    const zohoCustomer = await kycZohoIntegration.handleKYCCompletion(userId, planDetails);
    
    res.status(200).json({
      success: true,
      message: 'KYC completion handled successfully',
      data: {
        zohoCustomerId: zohoCustomer.contact_id,
        customerName: zohoCustomer.contact_name
      }
    });
  } catch (error) {
    console.error('❌ KYC completion handling error:', error);
    next(error);
  }
});

// @desc    Record payment in Zoho Books
// @route   POST /api/zoho/record-payment/:userId
// @access  Private
router.post('/record-payment/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const paymentDetails = req.body;
    
    console.log(`💰 Recording payment for user: ${userId}`);
    
    const payment = await kycZohoIntegration.recordPayment(userId, paymentDetails);
    
    res.status(200).json({
      success: true,
      message: 'Payment recorded in Zoho Books successfully',
      data: {
        paymentId: payment.payment_id,
        amount: payment.amount
      }
    });
  } catch (error) {
    console.error('❌ Payment recording error:', error);
    next(error);
  }
});

// @desc    Handle KYC rejection
// @route   POST /api/zoho/kyc-rejected/:userId
// @access  Private (Admin)
router.post('/kyc-rejected/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;
    
    console.log(`❌ KYC rejection handling for user: ${userId}`);
    
    const zohoCustomer = await kycZohoIntegration.handleKYCRejection(userId, rejectionReason);
    
    res.status(200).json({
      success: true,
      message: 'KYC rejection handled successfully',
      data: {
        zohoCustomerId: zohoCustomer.contact_id,
        customerName: zohoCustomer.contact_name
      }
    });
  } catch (error) {
    console.error('❌ KYC rejection handling error:', error);
    next(error);
  }
});

// @desc    Create invoice for user
// @route   POST /api/zoho/create-invoice/:userId
// @access  Private
router.post('/create-invoice/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { planDetails } = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.zohoBooksCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'User not found or not synced to Zoho Books'
      });
    }
    
    console.log(`📄 Creating invoice for user: ${userId}`);
    
    const invoice = await kycZohoIntegration.createInvoiceForPlan(user.zohoBooksCustomerId, planDetails);
    
    res.status(200).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        invoiceId: invoice.invoice_id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.total
      }
    });
  } catch (error) {
    console.error('❌ Invoice creation error:', error);
    next(error);
  }
});

// @desc    Get user's Zoho Books sync status
// @route   GET /api/zoho/sync-status/:userId
// @access  Private
router.get('/sync-status/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let zohoCustomer = null;
    if (user.zohoBooksCustomerId) {
      try {
        // Get customer details from Zoho Books
        zohoCustomer = await zohoBooksService.getCustomerByEmail(user.email);
      } catch (error) {
        console.log('Could not fetch customer from Zoho Books:', error.message);
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        zohoBooksCustomerId: user.zohoBooksCustomerId,
        zohoBooksSyncedAt: user.zohoBooksSyncedAt,
        zohoBooksSyncStatus: user.zohoBooksSyncStatus,
        zohoCustomerExists: !!zohoCustomer,
        zohoCustomerDetails: zohoCustomer
      }
    });
  } catch (error) {
    console.error('❌ Sync status check error:', error);
    next(error);
  }
});

// @desc    Test Zoho Books connection
// @route   GET /api/zoho/test-connection
// @access  Private (Admin)
router.get('/test-connection', protect, async (req, res, next) => {
  try {
    console.log('🧪 Testing Zoho Books connection...');
    
    // Try to fetch organization info or items to test connection
    const items = await zohoBooksService.getItems();
    
    res.status(200).json({
      success: true,
      message: 'Zoho Books connection successful',
      data: {
        connected: true,
        itemsCount: items.length,
        organizationId: process.env.ZOHO_BOOKS_ORGANIZATION_ID
      }
    });
  } catch (error) {
    console.error('❌ Zoho Books connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Zoho Books connection failed',
      error: error.message
    });
  }
});

export default router;