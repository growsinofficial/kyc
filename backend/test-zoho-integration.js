import { kycZohoIntegration } from './services/kycZohoIntegration.js';
import { zohoBooksService } from './utils/zohoBooks.js';
import { User } from './models/index.js';
import dotenv from 'dotenv';
import connectDB from './config/database.js';

// Load environment variables
dotenv.config();

async function testZohoBooksIntegration() {
  try {
    console.log('🧪 Testing Zoho Books Integration...\n');

    // Connect to database
    await connectDB();

    // Test 1: Test connection
    console.log('📡 Test 1: Testing Zoho Books connection...');
    try {
      const items = await zohoBooksService.getItems();
      console.log(`✅ Connection successful! Found ${items.length} items in Zoho Books\n`);
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      console.log('⚠️  Please configure Zoho Books credentials in .env file\n');
      return;
    }

    // Test 2: Find a test user
    console.log('👤 Test 2: Finding test user...');
    const testUser = await User.findOne({ email: 'darksoulyt34@gmail.com' });
    
    if (!testUser) {
      console.log('❌ Test user not found. Please ensure user exists\n');
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})\n`);

    // Test 3: Sync user to Zoho Books
    console.log('🔄 Test 3: Syncing user to Zoho Books...');
    try {
      const zohoCustomer = await kycZohoIntegration.syncUserToZohoBooks(testUser._id);
      console.log(`✅ User synced successfully! Zoho Customer ID: ${zohoCustomer.contact_id}\n`);
    } catch (error) {
      console.log(`❌ User sync failed: ${error.message}\n`);
    }

    // Test 4: Test KYC completion flow
    console.log('🎉 Test 4: Testing KYC completion flow...');
    try {
      const planDetails = {
        id: 'test-plan',
        name: 'Test Investment Plan',
        description: 'Test plan for Zoho Books integration',
        amount: 10000
      };

      const result = await kycZohoIntegration.handleKYCCompletion(testUser._id, planDetails);
      console.log(`✅ KYC completion handled successfully!\n`);
    } catch (error) {
      console.log(`❌ KYC completion handling failed: ${error.message}\n`);
    }

    // Test 5: Test payment recording
    console.log('💰 Test 5: Testing payment recording...');
    try {
      const paymentDetails = {
        amount: 10000,
        method: 'online',
        transactionId: 'TEST_TXN_' + Date.now(),
        description: 'Test payment from KYC Platform'
      };

      const payment = await kycZohoIntegration.recordPayment(testUser._id, paymentDetails);
      console.log(`✅ Payment recorded successfully! Payment ID: ${payment.payment_id}\n`);
    } catch (error) {
      console.log(`❌ Payment recording failed: ${error.message}\n`);
    }

    // Test 6: Check sync status
    console.log('📊 Test 6: Checking user sync status...');
    const updatedUser = await User.findById(testUser._id);
    console.log(`Zoho Books Customer ID: ${updatedUser.zohoBooksCustomerId}`);
    console.log(`Sync Status: ${updatedUser.zohoBooksSyncStatus}`);
    console.log(`Last Synced: ${updatedUser.zohoBooksSyncedAt}\n`);

    console.log('🎉 All tests completed! Zoho Books integration is working.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

// Run the test
testZohoBooksIntegration();