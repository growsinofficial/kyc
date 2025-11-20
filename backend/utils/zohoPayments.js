const axios = require('axios');
const crypto = require('crypto');
const zohoOAuth = require('./zohoOAuth');

class ZohoPaymentsService {
  constructor() {
    this.baseURL = process.env.ZOHO_PAYMENT_BASE_URL || 'https://www.zoho.com/checkout/api/v1';
    this.apiKey = process.env.ZOHO_PAYMENT_API_KEY;
    this.signingKey = process.env.ZOHO_PAYMENT_SIGNING_KEY;
    this.organizationId = process.env.ZOHO_ORGANIZATION_ID;
    this.webhookSecret = process.env.ZOHO_WEBHOOK_SECRET;
    this.useOAuth = process.env.ZOHO_OAUTH_CLIENT_ID && !process.env.ZOHO_OAUTH_CLIENT_ID.includes('your_');
  }

  /**
   * Get authentication headers
   * @returns {Promise<Object>} Authentication headers
   */
  async getAuthHeaders() {
    if (this.useOAuth) {
      try {
        const accessToken = await zohoOAuth.getValidAccessToken();
        return {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        };
      } catch (error) {
        console.warn('⚠️ OAuth failed, falling back to API key');
      }
    }
    
    // Fallback to API key authentication
    return {
      'Authorization': `Zoho-oauthtoken ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create a checkout session for payment
   * @param {Object} sessionData - Session configuration
   * @returns {Promise<Object>} Checkout session details
   */
  async createCheckoutSession(sessionData) {
    try {
      const {
        amount,
        currency = 'INR',
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        planName,
        description,
        redirectUrl,
        cancelUrl,
        webhookUrl
      } = sessionData;

      const sessionPayload = {
        amount: parseFloat(amount),
        currency,
        customer_details: {
          customer_id: customerId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone
        },
        product_details: {
          name: planName || 'Investment Plan',
          description: description || 'KYC Investment Plan Payment',
          type: 'service'
        },
        redirect_url: redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        webhook_url: webhookUrl || `${process.env.BACKEND_URL}/api/payments/webhook`,
        notes: {
          kyc_platform: 'true',
          customer_id: customerId,
          plan_name: planName
        }
      };

      console.log('🔄 Creating Zoho checkout session...');
      
      const headers = await this.getAuthHeaders();
      const response = await axios.post(
        `${this.baseURL}/checkout/session`,
        sessionPayload,
        { headers }
      );

      console.log('✅ Checkout session created successfully');
      return {
        success: true,
        sessionId: response.data.session_id,
        checkoutUrl: response.data.checkout_url,
        sessionData: response.data
      };

    } catch (error) {
      console.error('❌ Error creating checkout session:', error.response?.data || error.message);
      throw new Error(`Failed to create checkout session: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get payment details by session ID
   * @param {string} sessionId - Checkout session ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentDetails(sessionId) {
    try {
      console.log(`🔄 Fetching payment details for session: ${sessionId}`);
      
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${this.baseURL}/checkout/session/${sessionId}`,
        { headers }
      );

      return {
        success: true,
        paymentData: response.data
      };

    } catch (error) {
      console.error('❌ Error fetching payment details:', error.response?.data || error.message);
      throw new Error(`Failed to fetch payment details: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Webhook signature header
   * @returns {boolean} Verification result
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return signature === `sha256=${expectedSignature}`;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error.message);
      return false;
    }
  }

  /**
   * Process webhook payload
   * @param {Object} webhookData - Webhook payload
   * @returns {Object} Processed webhook data
   */
  processWebhook(webhookData) {
    const {
      event_type,
      session_id,
      payment_id,
      status,
      amount,
      currency,
      customer_details,
      notes,
      created_time,
      updated_time
    } = webhookData;

    return {
      eventType: event_type,
      sessionId: session_id,
      paymentId: payment_id,
      status,
      amount: parseFloat(amount),
      currency,
      customerDetails: customer_details,
      customerId: notes?.customer_id,
      planName: notes?.plan_name,
      createdTime: created_time,
      updatedTime: updated_time,
      isKycPlatform: notes?.kyc_platform === 'true'
    };
  }

  /**
   * Generate checkout widget configuration
   * @param {Object} config - Widget configuration
   * @returns {Object} Widget config for frontend
   */
  generateWidgetConfig(config) {
    const {
      sessionId,
      theme = 'light',
      showHeader = true,
      showFooter = true,
      autoResize = true
    } = config;

    return {
      sessionId,
      apiKey: this.apiKey,
      theme,
      config: {
        show_header: showHeader,
        show_footer: showFooter,
        auto_resize: autoResize,
        width: '100%',
        height: 'auto'
      },
      events: {
        onSuccess: 'handlePaymentSuccess',
        onFailure: 'handlePaymentFailure',
        onCancel: 'handlePaymentCancel'
      }
    };
  }

  /**
   * Create refund for a payment
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Refund amount (optional, full refund if not specified)
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund details
   */
  async createRefund(paymentId, amount = null, reason = 'Customer request') {
    try {
      const refundPayload = {
        payment_id: paymentId,
        reason,
        ...(amount && { amount: parseFloat(amount) })
      };

      console.log(`🔄 Creating refund for payment: ${paymentId}`);
      
      const response = await axios.post(
        `${this.baseURL}/refunds`,
        refundPayload,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Refund created successfully');
      return {
        success: true,
        refundId: response.data.refund_id,
        refundData: response.data
      };

    } catch (error) {
      console.error('❌ Error creating refund:', error.response?.data || error.message);
      throw new Error(`Failed to create refund: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all payments with filters
   * @param {Object} filters - Payment filters
   * @returns {Promise<Object>} Payment list
   */
  async getPayments(filters = {}) {
    try {
      const {
        status,
        customerId,
        fromDate,
        toDate,
        limit = 50,
        offset = 0
      } = filters;

      const params = new URLSearchParams({
        limit,
        offset,
        ...(status && { status }),
        ...(customerId && { customer_id: customerId }),
        ...(fromDate && { from_date: fromDate }),
        ...(toDate && { to_date: toDate })
      });

      console.log('🔄 Fetching payments with filters...');
      
      const response = await axios.get(
        `${this.baseURL}/payments?${params}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        payments: response.data.payments || [],
        totalCount: response.data.total_count || 0
      };

    } catch (error) {
      console.error('❌ Error fetching payments:', error.response?.data || error.message);
      throw new Error(`Failed to fetch payments: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Test API connection
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      console.log('🔄 Testing Zoho Payments connection...');
      
      // Try to fetch organization details or make a simple API call
      const response = await axios.get(
        `${this.baseURL}/organization`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Zoho Payments connection successful');
      return {
        success: true,
        message: 'Connection to Zoho Payments successful',
        organizationData: response.data
      };

    } catch (error) {
      console.error('❌ Zoho Payments connection failed:', error.response?.data || error.message);
      return {
        success: false,
        message: `Connection failed: ${error.response?.data?.message || error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new ZohoPaymentsService();