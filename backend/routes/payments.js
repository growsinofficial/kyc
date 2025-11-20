import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';
import Plan from '../models/Plan.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { kycZohoIntegration } from '../services/kycZohoIntegration.js';
import { zohoBooksService } from '../utils/zohoBooks.js';
import rateLimit from 'express-rate-limit';
// Note: Convert to ES6 imports when ready
// import zohoPayments from '../utils/zohoPayments.js';
// import zohoIntegration from '../services/kycZohoIntegration.js';

const router = express.Router();
// Per-user rate limiters for payments
const paymentUserLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req.user?._id?.toString() || req.ip),
  standardHeaders: true,
  legacyHeaders: false
});

// Webhook rate limiter by IP
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false
});

// Zoho Payment Configuration
const ZOHO_PAYMENT_CONFIG = {
  baseUrl: process.env.ZOHO_PAYMENT_BASE_URL || 'https://www.zoho.com/checkout/api/v1',
  organizationId: process.env.ZOHO_ORGANIZATION_ID,
  apiKey: process.env.ZOHO_PAYMENT_API_KEY,
  signingKey: process.env.ZOHO_PAYMENT_SIGNING_KEY,
  webhookSecret: process.env.ZOHO_WEBHOOK_SECRET
};

// @desc    Initiate payment with Zoho
// @route   POST /api/payments/initiate
// @access  Private
router.post('/initiate', protect, paymentUserLimiter, async (req, res, next) => {
  try {
    const { planId, paymentMethod = 'zoho' } = req.body;
    const userId = req.user._id;

    // Validate plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      userId,
      planId,
      amount: plan.price,
      currency: 'INR',
      paymentMethod,
      paymentGateway: 'zoho',
      status: 'pending'
    });
    await transaction.save();

    // Prepare Zoho payment payload
    const paymentPayload = {
      organization_id: ZOHO_PAYMENT_CONFIG.organizationId,
      customer: {
        customer_id: userId.toString(),
        first_name: req.user.name.split(' ')[0],
        last_name: req.user.name.split(' ').slice(1).join(' ') || '',
        email: req.user.email,
        mobile: req.user.mobile
      },
      line_items: [{
        item_id: plan._id.toString(),
        name: plan.name,
        description: plan.description,
        quantity: 1,
        price: plan.price
      }],
      currency_code: 'INR',
      redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      webhook_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      reference_id: transaction._id.toString(),
      payment_options: {
        payment_gateways: ['razorpay', 'payu', 'stripe'] // Zoho supports multiple gateways
      }
    };

    // Call Zoho Payment API
    const zohoResponse = await axios.post(
      `${ZOHO_PAYMENT_CONFIG.baseUrl}/checkout/session`,
      paymentPayload,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${ZOHO_PAYMENT_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update transaction with Zoho payment details
    transaction.gatewayOrderId = zohoResponse.data.hostedpage?.hostedpage_id || zohoResponse.data.hostedpage?.id;
    transaction.gatewayResponse = zohoResponse.data;
    await transaction.save();

    res.status(200).json({
      success: true,
      data: {
        transactionId: transaction._id,
        paymentUrl: zohoResponse.data.hostedpage.url,
        orderDetails: zohoResponse.data.hostedpage
      }
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    
    // Handle Zoho API errors
    if (error.response?.data) {
      return res.status(400).json({
        success: false,
        error: 'Payment gateway error',
        details: error.response.data
      });
    }

    next(error);
  }
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, paymentUserLimiter, async (req, res, next) => {
  try {
    const { paymentId, signature, transactionId } = req.body;

    // Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Idempotency: if already completed, return success
    if (transaction.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: { transactionId: transaction._id, status: 'completed' }
      });
    }

    // Verify with Zoho
    const verificationResponse = await axios.get(
      `${ZOHO_PAYMENT_CONFIG.baseUrl}/checkout/session/${transaction.gatewayOrderId}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${ZOHO_PAYMENT_CONFIG.apiKey}`
        }
      }
    );

    const paymentStatus = verificationResponse.data.hostedpage.status;

    // Update transaction based on verification
    if (paymentStatus === 'paid') {
      transaction.status = 'completed';
      transaction.gatewayPaymentId = paymentId || transaction.gatewayPaymentId;
      transaction.gatewayTransactionId = transaction.gatewayTransactionId || verificationResponse.data.hostedpage?.payment_id;
      transaction.paymentMethod = transaction.paymentMethod || 'online';
      transaction.completedAt = new Date();
      
      // Update user's subscription/plan status
      await User.findByIdAndUpdate(transaction.userId, {
        currentPlan: transaction.planId,
        planPurchasedAt: new Date(),
        subscriptionStatus: 'active'
      });

      await transaction.save();

      // Ensure customer exists in Zoho Books, create invoice, email it, and record the payment
      try {
        const user = await User.findById(transaction.userId);
        const plan = await Plan.findById(transaction.planId);
        // Sync user to Zoho Books (create/update customer)
        const zohoCustomer = await kycZohoIntegration.syncUserToZohoBooks(user._id);
        // Create invoice for the purchased plan
        // Idempotency: if invoice already exists on transaction, reuse
        let invoiceId = transaction.invoiceNumber ? undefined : undefined;
        const invoice = transaction.invoiceNumber ? { invoice_id: transaction.invoiceNumber } : await kycZohoIntegration.createInvoiceForPlan(zohoCustomer.contact_id, {
          id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          amount: plan.price
        });
        // Persist invoice number if created now
        if (!transaction.invoiceNumber && invoice?.invoice_id) {
          transaction.invoiceNumber = invoice.invoice_id;
          await transaction.save();
        }
        // Email invoice to customer
        try {
          await zohoBooksService.sendInvoiceByEmail((invoice.invoice_id || transaction.invoiceNumber), user.email);
        } catch (e) {
          console.warn('Invoice email failed (non-blocking):', e.message);
        }
        // Record payment against the invoice if not already recorded
        if (!transaction.gatewayPaymentId) {
          console.warn('Missing gatewayPaymentId; skipping payment record idempotency check');
        }
        await kycZohoIntegration.recordPayment(user._id, {
          amount: plan.price,
          method: 'online',
          transactionId: paymentId || transaction.gatewayPaymentId,
          description: `Payment for plan: ${plan.name}`,
          invoiceId: (invoice.invoice_id || transaction.invoiceNumber)
        });
      } catch (zohoErr) {
        console.error('Zoho Books post-payment workflow failed:', zohoErr.message);
        // Non-blocking for user response
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          transactionId: transaction._id,
          status: 'completed'
        }
      });
    } else {
      transaction.status = 'failed';
      await transaction.save();

      res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        status: paymentStatus
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    next(error);
  }
});

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
router.get('/history', protect, async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('planId', 'name price description')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Handle Zoho webhooks
// @route   POST /api/payments/webhook
// @access  Public (but verified with signature)
router.post('/webhook', webhookLimiter, async (req, res, next) => {
  try {
    const signature = req.headers['x-zoho-webhook-signature'];
    // When server.js mounts express.raw for this path, req.body is a Buffer
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', ZOHO_PAYMENT_CONFIG.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    // Parse event body
    const parsed = Buffer.isBuffer(req.body) ? JSON.parse(rawBody.toString('utf8')) : req.body;
    const { event_type, data } = parsed;

    // Handle different webhook events
    switch (event_type) {
      case 'payment_succeeded':
        await handlePaymentSuccess(data);
        break;
      case 'payment_failed':
        await handlePaymentFailure(data);
        break;
      case 'subscription_created':
        await handleSubscriptionCreated(data);
        break;
      default:
        console.log('Unhandled webhook event:', event_type);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    next(error);
  }
});

// Helper functions for webhook handling
async function handlePaymentSuccess(data) {
  try {
    const transaction = await Transaction.findOne({
      gatewayOrderId: data.hostedpage_id || data.hostedpage?.id
    });

    if (transaction) {
      // Idempotency: if already completed, skip
      if (transaction.status === 'completed') {
        return;
      }
      transaction.status = 'completed';
      transaction.gatewayPaymentId = data.payment_id || transaction.gatewayPaymentId;
      transaction.completedAt = new Date();
      await transaction.save();

      // Update user's plan
      await User.findByIdAndUpdate(transaction.userId, {
        currentPlan: transaction.planId,
        planPurchasedAt: new Date(),
        subscriptionStatus: 'active'
      });

      console.log('Payment success handled for transaction:', transaction._id);

      // Repeat Zoho post-payment workflow in webhook path as well (idempotent in Zoho)
      try {
        const user = await User.findById(transaction.userId);
        const plan = await Plan.findById(transaction.planId);
        const zohoCustomer = await kycZohoIntegration.syncUserToZohoBooks(user._id);
        const invoice = transaction.invoiceNumber ? { invoice_id: transaction.invoiceNumber } : await kycZohoIntegration.createInvoiceForPlan(zohoCustomer.contact_id, {
          id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          amount: plan.price
        });
        if (!transaction.invoiceNumber && invoice?.invoice_id) {
          transaction.invoiceNumber = invoice.invoice_id;
          await transaction.save();
        }
        try {
          await zohoBooksService.sendInvoiceByEmail((invoice.invoice_id || transaction.invoiceNumber), user.email);
        } catch (e) {
          console.warn('Invoice email failed (webhook, non-blocking):', e.message);
        }
        await kycZohoIntegration.recordPayment(user._id, {
          amount: plan.price,
          method: 'online',
          transactionId: data.payment_id || transaction.gatewayPaymentId,
          description: `Payment for plan: ${plan.name}`,
          invoiceId: (invoice.invoice_id || transaction.invoiceNumber)
        });
      } catch (zohoErr) {
        console.error('Zoho Books webhook workflow failed:', zohoErr.message);
      }
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(data) {
  try {
    const transaction = await Transaction.findOne({
      paymentGatewayOrderId: data.hostedpage_id
    });

    if (transaction) {
      transaction.status = 'failed';
      transaction.failureReason = data.failure_reason;
      await transaction.save();

      console.log('Payment failure handled for transaction:', transaction._id);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleSubscriptionCreated(data) {
  try {
    // Handle subscription creation if using recurring payments
    console.log('Subscription created:', data);
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

export default router;