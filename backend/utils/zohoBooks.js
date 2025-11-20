import axios from 'axios';

class ZohoBooksService {
  constructor() {
    this.baseURL = process.env.ZOHO_BOOKS_BASE_URL;
    this.organizationId = process.env.ZOHO_BOOKS_ORGANIZATION_ID;
    this.clientId = process.env.ZOHO_BOOKS_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_BOOKS_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_BOOKS_REFRESH_TOKEN;
    this.accessToken = process.env.ZOHO_BOOKS_ACCESS_TOKEN;
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
        }
      });

      this.accessToken = response.data.access_token;
      console.log('✅ Zoho Books access token refreshed');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to refresh Zoho Books token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Make authenticated API request
  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          organization_id: this.organizationId
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      // If token expired, try to refresh and retry
      if (error.response?.status === 401) {
        console.log('🔄 Access token expired, refreshing...');
        await this.refreshAccessToken();
        
        // Retry the request with new token
        const retryConfig = {
          method,
          url: `${this.baseURL}${endpoint}`,
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            organization_id: this.organizationId
          }
        };

        if (data) {
          retryConfig.data = data;
        }

        const retryResponse = await axios(retryConfig);
        return retryResponse.data;
      }
      
      console.error('❌ Zoho Books API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create a customer in Zoho Books
  async createCustomer(customerData) {
    try {
      console.log('📝 Creating customer in Zoho Books:', customerData.display_name);
      
      const response = await this.makeRequest('POST', '/contacts', customerData);
      
      if (response.code === 0) {
        console.log('✅ Customer created successfully in Zoho Books:', response.contact.contact_id);
        return response.contact;
      } else {
        throw new Error(response.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('❌ Failed to create customer in Zoho Books:', error.message);
      throw error;
    }
  }

  // Update customer in Zoho Books
  async updateCustomer(contactId, customerData) {
    try {
      console.log('📝 Updating customer in Zoho Books:', contactId);
      
      const response = await this.makeRequest('PUT', `/contacts/${contactId}`, customerData);
      
      if (response.code === 0) {
        console.log('✅ Customer updated successfully in Zoho Books');
        return response.contact;
      } else {
        throw new Error(response.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('❌ Failed to update customer in Zoho Books:', error.message);
      throw error;
    }
  }

  // Get customer by email
  async getCustomerByEmail(email) {
    try {
      const response = await this.makeRequest('GET', `/contacts?email=${encodeURIComponent(email)}`);
      
      if (response.code === 0 && response.contacts && response.contacts.length > 0) {
        return response.contacts[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get customer by email:', error.message);
      return null;
    }
  }

  // Create an invoice for a customer
  async createInvoice(invoiceData) {
    try {
      console.log('📄 Creating invoice in Zoho Books for customer:', invoiceData.customer_id);
      
      const response = await this.makeRequest('POST', '/invoices', invoiceData);
      
      if (response.code === 0) {
        console.log('✅ Invoice created successfully:', response.invoice.invoice_id);
        return response.invoice;
      } else {
        throw new Error(response.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('❌ Failed to create invoice:', error.message);
      throw error;
    }
  }

  // Create an item/service in Zoho Books
  async createItem(itemData) {
    try {
      console.log('📦 Creating item in Zoho Books:', itemData.name);
      
      const response = await this.makeRequest('POST', '/items', itemData);
      
      if (response.code === 0) {
        console.log('✅ Item created successfully:', response.item.item_id);
        return response.item;
      } else {
        throw new Error(response.message || 'Failed to create item');
      }
    } catch (error) {
      console.error('❌ Failed to create item:', error.message);
      throw error;
    }
  }

  // Get all items
  async getItems() {
    try {
      const response = await this.makeRequest('GET', '/items');
      
      if (response.code === 0) {
        return response.items || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ Failed to get items:', error.message);
      return [];
    }
  }

  // Create a payment record
  async createPayment(paymentData) {
    try {
      console.log('💰 Creating payment record in Zoho Books');
      
      const response = await this.makeRequest('POST', '/customerpayments', paymentData);
      
      if (response.code === 0) {
        console.log('✅ Payment recorded successfully:', response.payment.payment_id);
        return response.payment;
      } else {
        throw new Error(response.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('❌ Failed to record payment:', error.message);
      throw error;
    }
  }

  // Add a note to customer
  async addCustomerNote(contactId, note) {
    try {
      const noteData = {
        description: note,
        commented_time: new Date().toISOString()
      };
      
      const response = await this.makeRequest('POST', `/contacts/${contactId}/comments`, noteData);
      
      if (response.code === 0) {
        console.log('✅ Note added to customer successfully');
        return response.comment;
      } else {
        throw new Error(response.message || 'Failed to add note');
      }
    } catch (error) {
      console.error('❌ Failed to add customer note:', error.message);
      throw error;
    }
  }

  // Email an invoice to the customer
  async sendInvoiceByEmail(invoiceId, toEmail, subject = 'Your Invoice from Growsin', body = 'Please find your invoice attached.') {
    try {
      console.log('✉️ Sending invoice by email:', invoiceId, 'to', toEmail);
      const payload = {
        to_mail_ids: [toEmail],
        subject,
        body
      };

      const response = await this.makeRequest('POST', `/invoices/${invoiceId}/email`, payload);

      if (response.code === 0) {
        console.log('✅ Invoice email triggered successfully');
        return true;
      } else {
        throw new Error(response.message || 'Failed to email invoice');
      }
    } catch (error) {
      console.error('❌ Failed to email invoice:', error.message);
      throw error;
    }
  }
}

// Helper functions to format data for Zoho Books

export function formatCustomerData(user, kycData = null) {
  const customerData = {
    contact_name: user.name,
    display_name: user.name,
    email: user.email,
    phone: user.mobile,
    contact_type: 'customer',
    currency_code: 'INR',
    payment_terms: 15,
    custom_fields: [
      {
        api_name: 'cf_kyc_status',
        value: user.kycStatus || 'not_started'
      },
      {
        api_name: 'cf_registration_date',
        value: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      },
      {
        api_name: 'cf_email_verified',
        value: user.emailVerified ? 'Yes' : 'No'
      },
      {
        api_name: 'cf_mobile_verified',
        value: user.mobileVerified ? 'Yes' : 'No'
      }
    ]
  };

  // Add billing address if KYC data is available
  if (kycData && kycData.address) {
    customerData.billing_address = {
      address: kycData.address.street || '',
      city: kycData.address.city || '',
      state: kycData.address.state || '',
      zip: kycData.address.pincode || '',
      country: 'India'
    };
  }

  return customerData;
}

export function formatInvoiceData(customerId, items, dueDate = null) {
  const invoiceData = {
    customer_id: customerId,
    date: new Date().toISOString().split('T')[0],
    due_date: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
    line_items: items.map(item => ({
      item_id: item.item_id,
      name: item.name,
      description: item.description || '',
      rate: item.rate || 0,
      quantity: item.quantity || 1,
      tax_id: item.tax_id || null
    })),
    notes: 'Invoice generated from KYC Platform',
    terms: 'Payment due within 15 days of invoice date.',
    currency_code: 'INR'
  };

  return invoiceData;
}

export const zohoBooksService = new ZohoBooksService();
export default ZohoBooksService;