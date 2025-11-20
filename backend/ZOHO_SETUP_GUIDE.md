# Zoho Payments & OAuth Setup Guide

## 🎯 Quick Start: Get Your Organization ID

### Method 1: From Zoho Payments Dashboard
1. **Login to Zoho Payments**: Go to [https://payments.zoho.in](https://payments.zoho.in)
2. **Check URL**: After login, your URL will look like: `https://payments.zoho.in/app/23137556/dashboard`
3. **Extract ID**: The number after `/app/` is your Organization ID (e.g., `23137556`)

### Method 2: From Settings
1. **Go to Settings** → **Organization** 
2. **Copy Organization ID** from the organization details section

### Method 3: From API Response
Use your existing API key to get organization details:

```bash
curl -X GET "https://www.zoho.com/checkout/api/v1/organization" \
     -H "Authorization: Zoho-oauthtoken YOUR_API_KEY"
```

## 🔐 OAuth Setup (Optional but Recommended for Production)

OAuth provides better security and token management than API keys alone.

### Step 1: Register OAuth Application

1. **Go to Zoho Developer Console**: [https://api-console.zoho.in](https://api-console.zoho.in)
2. **Ensure ORG Mode**: URL should show `client_type=ORG`
3. **Click "ADD CLIENT"**
4. **Fill Application Details**:
   ```
   Client Name: KYC Platform Payments
   Homepage URL: https://yourdomain.com
   Authorized Redirect URIs: https://yourapi.com/api/auth/zoho/callback
   ```
5. **Click "CREATE"**
6. **Note down**: Client ID and Client Secret

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Your Organization ID (from Step 1 above)
ZOHO_ORGANIZATION_ID=23137556

# OAuth Credentials (from Zoho Developer Console)
ZOHO_OAUTH_CLIENT_ID=1000.0SRSXXXXXXXXXXXXXXXX239V  
ZOHO_OAUTH_CLIENT_SECRET=fb01XXXXXXXXXXXXXXXXXXXXXXXX8abf
ZOHO_OAUTH_SCOPE=ZohoPay.payments.CREATE,ZohoPay.payments.READ,ZohoPay.payments.UPDATE,ZohoPay.refunds.CREATE,ZohoPay.refunds.READ

# These will be auto-filled after OAuth setup
ZOHO_OAUTH_REFRESH_TOKEN=your_oauth_refresh_token
ZOHO_OAUTH_ACCESS_TOKEN=your_oauth_access_token
```

### Step 3: Complete OAuth Authorization

1. **Start your server**: `npm run dev`
2. **Open setup URL**: `http://localhost:5000/api/auth/zoho/setup`
3. **Click authorization link** or go to: `http://localhost:5000/api/auth/zoho/authorize`
4. **Login to Zoho** and grant permissions
5. **Tokens auto-saved** to your `.env` file

## ⚡ Quick Configuration (API Key Only)

If you don't want OAuth setup right now, just add your Organization ID:

```bash
# Update your .env file
ZOHO_ORGANIZATION_ID=YOUR_ACTUAL_ORG_ID

# Generate a secure webhook secret
ZOHO_WEBHOOK_SECRET=wh_sec_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b
```

## 🧪 Test Your Setup

### Test API Key Integration
```bash
cd backend
node test-zoho-payments.js
```

### Test OAuth Integration (if configured)
```bash
curl -X GET "http://localhost:5000/api/auth/zoho/test"
```

## 🔧 Integration Status Check

### Current Status
- ✅ **API Key**: Configured and ready
- ✅ **Signing Key**: Configured for webhook verification  
- ⚠️ **Organization ID**: Needs your actual ID
- ⚠️ **OAuth**: Optional but recommended for production

### What Works Now
With just the Organization ID added:
- ✅ Payment session creation
- ✅ Checkout widget integration  
- ✅ Webhook processing
- ✅ Zoho Books integration
- ✅ Complete payment flow

## 📱 Frontend Integration

Your React component is ready to use:

```jsx
// In your route configuration
import ZohoPayment from './components/payment/ZohoPayment';

<Route path="/payment/:planId" element={<ZohoPayment />} />
```

## 🚀 Production Deployment

### Security Checklist
- [ ] Use OAuth tokens instead of API keys
- [ ] Set up webhook endpoint with SSL
- [ ] Configure proper CORS settings
- [ ] Use secure environment variable management
- [ ] Enable rate limiting on payment endpoints

### Webhook Configuration in Zoho
1. **Go to Zoho Payments** → **Settings** → **Webhooks**
2. **Add Webhook URL**: `https://yourapi.com/api/payments/webhook`
3. **Select Events**: `payment.success`, `payment.failed`, `payment.cancelled`
4. **Set Secret**: Use your `ZOHO_WEBHOOK_SECRET` value

## 🆘 Troubleshooting

### Common Issues

**"Invalid Organization ID"**
- Double-check the ID from your Zoho dashboard URL
- Ensure no extra spaces or characters

**"Authentication Failed"**  
- Verify API key is correct and not regenerated
- Check if OAuth tokens are expired (use refresh endpoint)

**"Session Creation Failed"**
- Ensure all required fields are provided
- Check amount is a valid number
- Verify customer email format

### Debug Commands

```bash
# Test configuration
node test-zoho-payments.js

# Check OAuth status  
curl http://localhost:5000/api/auth/zoho/setup

# Manual token refresh
curl -X POST http://localhost:5000/api/auth/zoho/refresh

# Test API connection
curl -X GET http://localhost:5000/api/payments/test-connection
```

## 📊 What You Get

### Complete Payment System
- 🔒 **Secure Checkout**: PCI-compliant widget
- 💳 **Multiple Methods**: Cards, UPI, NetBanking, Wallets  
- 📱 **Mobile Optimized**: Responsive design
- 🔄 **Auto-sync**: Payments → Zoho Books automatically

### Admin Features  
- 📊 **Payment Dashboard**: View all transactions
- 💰 **Refund Management**: Process refunds easily
- 📈 **Analytics**: Track success rates and methods
- 🔍 **Audit Trail**: Complete transaction history

---

## 🎉 Ready to Go!

Once you add your **Organization ID**, your payment system is production-ready!

**Next Steps**:
1. Add your Organization ID to `.env`
2. Test with: `node test-zoho-payments.js`  
3. Deploy and start accepting payments! 

OAuth setup is optional but recommended for production security.

---

**Need Help?** 
- 📧 Check the test results for specific issues
- 🔍 Use debug commands above
- 📋 Refer to error messages in console logs

**Last Updated**: November 2025