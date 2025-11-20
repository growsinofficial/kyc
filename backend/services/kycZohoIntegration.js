import { zohoBooksService, formatCustomerData, formatInvoiceData } from '../utils/zohoBooks.js';
import { User } from '../models/index.js';

class KYCZohoIntegration {
  
  // Sync user to Zoho Books when KYC status changes
  async syncUserToZohoBooks(userId, kycData = null) {
    try {
      console.log(`🔄 Syncing user ${userId} to Zoho Books...`);
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if customer already exists in Zoho Books
      let existingCustomer = await zohoBooksService.getCustomerByEmail(user.email);
      
      const customerData = formatCustomerData(user, kycData);
      
      let zohoCustomer;
      if (existingCustomer) {
        // Update existing customer
        zohoCustomer = await zohoBooksService.updateCustomer(existingCustomer.contact_id, customerData);
        console.log(`✅ Updated existing customer in Zoho Books: ${existingCustomer.contact_id}`);
      } else {
        // Create new customer
        zohoCustomer = await zohoBooksService.createCustomer(customerData);
        console.log(`✅ Created new customer in Zoho Books: ${zohoCustomer.contact_id}`);
      }

      // Update user record with Zoho Books customer ID
      user.zohoBooksCustomerId = zohoCustomer.contact_id;
      await user.save();

      // Add KYC status note
      const statusNote = `KYC Status updated to: ${user.kycStatus}. Updated from KYC Platform on ${new Date().toISOString()}`;
      await zohoBooksService.addCustomerNote(zohoCustomer.contact_id, statusNote);

      return zohoCustomer;
    } catch (error) {
      console.error('❌ Failed to sync user to Zoho Books:', error.message);
      throw error;
    }
  }

  // Handle KYC completion and create invoice if needed
  async handleKYCCompletion(userId, planDetails = null) {
    try {
      console.log(`🎉 Handling KYC completion for user ${userId}`);
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Sync user to Zoho Books first
      const zohoCustomer = await this.syncUserToZohoBooks(userId);

      // Add completion note
      const completionNote = `KYC process completed successfully on ${new Date().toISOString()}. Customer is now verified and active.`;
      await zohoBooksService.addCustomerNote(zohoCustomer.contact_id, completionNote);

      // Create invoice if plan details are provided
      if (planDetails && planDetails.amount > 0) {
        await this.createInvoiceForPlan(zohoCustomer.contact_id, planDetails);
      }

      return zohoCustomer;
    } catch (error) {
      console.error('❌ Failed to handle KYC completion:', error.message);
      throw error;
    }
  }

  // Create invoice for selected plan
  async createInvoiceForPlan(customerId, planDetails) {
    try {
      console.log(`📄 Creating invoice for plan: ${planDetails.name}`);

      // Get or create the plan item in Zoho Books
      let planItem = await this.getOrCreatePlanItem(planDetails);

      const invoiceItems = [{
        item_id: planItem.item_id,
        name: planDetails.name,
        description: planDetails.description || `Investment plan: ${planDetails.name}`,
        rate: planDetails.amount,
        quantity: 1
      }];

      const invoiceData = formatInvoiceData(customerId, invoiceItems);
      const invoice = await zohoBooksService.createInvoice(invoiceData);

      console.log(`✅ Invoice created for plan ${planDetails.name}: ${invoice.invoice_id}`);
      return invoice;
    } catch (error) {
      console.error('❌ Failed to create invoice for plan:', error.message);
      throw error;
    }
  }

  // Get or create investment plan item in Zoho Books
  async getOrCreatePlanItem(planDetails) {
    try {
      const items = await zohoBooksService.getItems();
      
      // Check if plan item already exists
      let existingItem = items.find(item => 
        item.name.toLowerCase() === planDetails.name.toLowerCase() ||
        item.sku === `PLAN_${planDetails.id || planDetails.name.toUpperCase().replace(/\s+/g, '_')}`
      );

      if (existingItem) {
        return existingItem;
      }

      // Create new plan item
      const itemData = {
        name: planDetails.name,
        description: planDetails.description || `Investment plan: ${planDetails.name}`,
        rate: planDetails.amount,
        sku: `PLAN_${planDetails.id || planDetails.name.toUpperCase().replace(/\s+/g, '_')}`,
        unit: 'pcs',
        item_type: 'service',
        product_type: 'service',
        is_taxable: true,
        tax_name: 'GST',
        tax_percentage: 18 // Adjust GST percentage as needed
      };

      const newItem = await zohoBooksService.createItem(itemData);
      return newItem;
    } catch (error) {
      console.error('❌ Failed to get or create plan item:', error.message);
      throw error;
    }
  }

  // Record payment in Zoho Books
  async recordPayment(userId, paymentDetails) {
    try {
      console.log(`💰 Recording payment for user ${userId}`);

      const user = await User.findById(userId);
      if (!user || !user.zohoBooksCustomerId) {
        throw new Error('User not found or not synced to Zoho Books');
      }

      const paymentData = {
        customer_id: user.zohoBooksCustomerId,
        payment_mode: paymentDetails.method || 'online',
        amount: paymentDetails.amount,
        date: new Date().toISOString().split('T')[0],
        reference_number: paymentDetails.transactionId || paymentDetails.reference,
        description: paymentDetails.description || 'Payment received via KYC Platform',
        currency_code: 'INR'
      };

      // If invoice ID is provided, link the payment to the invoice
      if (paymentDetails.invoiceId) {
        paymentData.invoices = [{
          invoice_id: paymentDetails.invoiceId,
          amount_applied: paymentDetails.amount
        }];
      }

      const payment = await zohoBooksService.createPayment(paymentData);

      // Add payment note to customer
      const paymentNote = `Payment received: ₹${paymentDetails.amount} via ${paymentDetails.method || 'online'} (Ref: ${paymentDetails.transactionId || paymentDetails.reference})`;
      await zohoBooksService.addCustomerNote(user.zohoBooksCustomerId, paymentNote);

      console.log(`✅ Payment recorded in Zoho Books: ${payment.payment_id}`);
      return payment;
    } catch (error) {
      console.error('❌ Failed to record payment:', error.message);
      throw error;
    }
  }

  // Handle KYC rejection
  async handleKYCRejection(userId, rejectionReason) {
    try {
      console.log(`❌ Handling KYC rejection for user ${userId}`);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Sync user to Zoho Books with rejection status
      const zohoCustomer = await this.syncUserToZohoBooks(userId);

      // Add rejection note
      const rejectionNote = `KYC application rejected on ${new Date().toISOString()}. Reason: ${rejectionReason}. Customer needs to resubmit documents.`;
      await zohoBooksService.addCustomerNote(zohoCustomer.contact_id, rejectionNote);

      return zohoCustomer;
    } catch (error) {
      console.error('❌ Failed to handle KYC rejection:', error.message);
      throw error;
    }
  }

  // Sync all users to Zoho Books (bulk operation)
  async syncAllUsersToZohoBooks() {
    try {
      console.log('🔄 Starting bulk sync of all users to Zoho Books...');

      const users = await User.find({});
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const user of users) {
        try {
          await this.syncUserToZohoBooks(user._id);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId: user._id,
            email: user.email,
            error: error.message
          });
        }
      }

      console.log(`✅ Bulk sync completed: ${results.success} success, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error('❌ Failed to sync all users:', error.message);
      throw error;
    }
  }
}

export const kycZohoIntegration = new KYCZohoIntegration();
export default KYCZohoIntegration;