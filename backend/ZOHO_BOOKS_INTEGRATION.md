# Zoho Books Integration for KYC Platform

## Overview

This integration automatically syncs KYC users, creates customers, generates invoices, and records payments in Zoho Books. It provides seamless financial management for your KYC platform.

## Features

- ✅ **Automatic Customer Creation**: New users are synced to Zoho Books as customers
- ✅ **KYC Status Tracking**: Customer records include KYC status and verification details
- ✅ **Invoice Generation**: Automatic invoice creation for selected investment plans
- ✅ **Payment Recording**: Payments are automatically recorded in Zoho Books
- ✅ **Status Notes**: Detailed notes added for KYC completion, rejection, and payments
- ✅ **Real-time Sync**: Background sync when KYC status changes

## Setup Instructions

### 1. Zoho Books API Setup

1. **Create Zoho Books Organization**
   - Go to [Zoho Books](https://www.zoho.com/books/)
   - Create an organization if you don't have one

2. **Create Zoho Developer App**
   - Go to [Zoho Developer Console](https://api-console.zoho.com/)
   - Create a new application
   - Choose "Server-based Applications"
   - Note down Client ID and Client Secret

3. **Generate Tokens**
   - Use Zoho OAuth 2.0 flow to get refresh token
   - Scope required: `ZohoBooks.fullaccess.all`

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# Zoho Books Integration
ZOHO_BOOKS_BASE_URL=https://www.zohoapis.com/books/v3
ZOHO_BOOKS_ORGANIZATION_ID=your_organization_id
ZOHO_BOOKS_CLIENT_ID=your_client_id
ZOHO_BOOKS_CLIENT_SECRET=your_client_secret
ZOHO_BOOKS_REFRESH_TOKEN=your_refresh_token
ZOHO_BOOKS_ACCESS_TOKEN=your_access_token
```

### 3. Testing the Integration

Run the test script to verify everything is working:

```bash
node test-zoho-integration.js
```

## API Endpoints

### Zoho Books Management

- `POST /api/zoho/sync-user/:userId` - Sync single user to Zoho Books
- `POST /api/zoho/sync-all-users` - Bulk sync all users
- `GET /api/zoho/sync-status/:userId` - Check user sync status
- `GET /api/zoho/test-connection` - Test Zoho Books connection

### KYC Integration

- `POST /api/zoho/kyc-completed/:userId` - Handle KYC completion
- `POST /api/zoho/kyc-rejected/:userId` - Handle KYC rejection
- `POST /api/zoho/create-invoice/:userId` - Create invoice for user
- `POST /api/zoho/record-payment/:userId` - Record payment

## Automatic Sync Events

The system automatically syncs data to Zoho Books when:

1. **User Registration**: New customer created in Zoho Books
2. **KYC Status Change**: Customer record updated with new status
3. **KYC Completion**: Customer marked as verified, invoice created if plan selected
4. **KYC Rejection**: Customer marked with rejection reason and note
5. **Payment Processing**: Payment recorded and linked to customer/invoice

## Data Flow

```
KYC Platform → Zoho Books
├── User Registration → Customer Creation
├── KYC Completion → Customer Update + Invoice
├── Plan Selection → Invoice Generation
├── Payment → Payment Recording
└── Status Changes → Customer Notes
```

## Customer Data Mapping

| KYC Platform | Zoho Books | Notes |
|--------------|------------|--------|
| user.name | contact_name | Customer name |
| user.email | email | Primary email |
| user.mobile | phone | Contact number |
| user.kycStatus | custom_field | KYC verification status |
| user.emailVerified | custom_field | Email verification status |
| user.mobileVerified | custom_field | Mobile verification status |
| kycData.address | billing_address | Address from KYC form |

## Invoice Generation

Invoices are automatically generated when:
- KYC is completed AND user has selected a plan
- Manual invoice creation via API

Invoice includes:
- Plan details as line items
- Customer information
- Due date (15 days default)
- GST calculation (18% default)

## Payment Recording

Payments are recorded with:
- Customer linkage
- Transaction reference
- Payment method
- Invoice linkage (if applicable)
- Automatic notes on customer record

## Error Handling

- **Token Expiry**: Automatic refresh using refresh token
- **API Failures**: Logged with detailed error messages
- **Background Sync**: Failures don't affect main KYC flow
- **Retry Logic**: Built-in retry for failed API calls

## Monitoring

Check integration status:
- User sync status via API endpoints
- Server logs for sync activities
- Zoho Books dashboard for created records

## Security

- All API calls use OAuth 2.0 authentication
- Tokens are automatically refreshed
- No sensitive data stored in logs
- Background operations don't expose errors to users

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check environment variables
   - Verify organization ID
   - Ensure tokens are valid

2. **Customer Creation Failed**
   - Check required fields
   - Verify email format
   - Check for duplicates

3. **Invoice Creation Failed**
   - Ensure customer exists
   - Check plan details
   - Verify tax settings

### Debug Mode

Enable detailed logging by checking server console for:
- `🔄 Syncing user...` - Sync operations
- `✅ Success messages` - Successful operations
- `❌ Error messages` - Failed operations

## Customization

### Custom Fields

Add custom fields in `formatCustomerData()` function:

```javascript
custom_fields: [
  {
    api_name: 'cf_your_field',
    value: 'your_value'
  }
]
```

### Invoice Items

Modify invoice generation in `createInvoiceForPlan()`:

```javascript
const invoiceItems = [{
  name: 'Custom Item',
  rate: amount,
  quantity: 1,
  tax_percentage: 18
}];
```

## Support

For issues with:
- **Zoho Books API**: Check [Zoho Books API Documentation](https://www.zoho.com/books/api/v3/)
- **Integration Logic**: Review server logs and test scripts
- **Authentication**: Verify OAuth setup in Zoho Developer Console

---

**Last Updated**: November 2025  
**Version**: 1.0.0