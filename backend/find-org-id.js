const axios = require('axios');
require('dotenv').config();

/**
 * Helper script to find your Zoho Organization ID
 * Run with: node find-org-id.js
 */

console.log('🔍 Finding your Zoho Organization ID...\n');

async function findOrganizationId() {
  const apiKey = process.env.ZOHO_PAYMENT_API_KEY;
  
  if (!apiKey || apiKey.includes('your_')) {
    console.log('❌ API Key not configured in .env file');
    console.log('   Please add your ZOHO_PAYMENT_API_KEY first');
    return;
  }

  console.log('✅ API Key found, checking organization details...\n');

  try {
    // Method 1: Try organization endpoint
    console.log('🔄 Method 1: Checking organization endpoint...');
    
    const response = await axios.get(
      'https://www.zoho.com/checkout/api/v1/organization',
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.organization_id) {
      console.log('🎉 Organization ID found!');
      console.log(`📋 Your Organization ID: ${response.data.organization_id}`);
      console.log(`📝 Organization Name: ${response.data.organization_name || 'N/A'}`);
      console.log(`🏢 Company Name: ${response.data.company_name || 'N/A'}`);
      
      console.log('\n📋 Add this to your .env file:');
      console.log(`ZOHO_ORGANIZATION_ID=${response.data.organization_id}`);
      
      return response.data.organization_id;
    }

  } catch (error) {
    console.log('⚠️ Organization endpoint failed:', error.response?.status || error.message);
    
    if (error.response?.status === 404) {
      console.log('   This endpoint might not be available in your Zoho plan');
    } else if (error.response?.status === 401) {
      console.log('   API key authentication failed');
    }
  }

  // Method 2: Try to extract from error response or other endpoints
  console.log('\n🔄 Method 2: Checking other endpoints for clues...');
  
  try {
    // Try creating a minimal session to see if we get org info in error
    const sessionResponse = await axios.post(
      'https://www.zoho.com/checkout/api/v1/checkout/session',
      {
        amount: 1,
        currency: 'INR'
      },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

  } catch (sessionError) {
    if (sessionError.response?.data) {
      const errorData = sessionError.response.data;
      console.log('📋 Error response contains:');
      console.log(JSON.stringify(errorData, null, 2));
      
      // Look for organization-related fields in error
      const errorStr = JSON.stringify(errorData);
      const orgMatches = errorStr.match(/organization[_-]?id[":]*\s*["]*(\w+)/i);
      
      if (orgMatches && orgMatches[1]) {
        console.log(`🔍 Possible Organization ID found: ${orgMatches[1]}`);
      }
    }
  }

  // Method 3: Manual instructions
  console.log('\n📖 Manual Method:');
  console.log('1. Login to Zoho Payments: https://payments.zoho.in');
  console.log('2. Look at the URL after login: https://payments.zoho.in/app/[ORG_ID]/dashboard');
  console.log('3. The number between /app/ and /dashboard is your Organization ID');
  console.log('');
  console.log('Alternative:');
  console.log('1. Go to Zoho Payments → Settings → Organization');
  console.log('2. Copy the Organization ID from the details section');
  
  console.log('\n🔧 Once you find it, update your .env file:');
  console.log('ZOHO_ORGANIZATION_ID=your_actual_org_id');
}

// Run the script
findOrganizationId()
  .then(() => {
    console.log('\n✅ Organization ID search complete!');
    console.log('💡 If you found your ID, update .env and run: node test-zoho-payments.js');
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    console.log('📋 Please find your Organization ID manually using the instructions above');
  });