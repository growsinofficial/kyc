import axios from 'axios';
import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';

async function testCompleteWorkflow() {
  console.log('🚀 Starting complete KYC workflow test...\n');
  console.log('📋 Test Environment:');
  console.log(`   Backend URL: ${BASE_URL}`);
  console.log(`   MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`);
  console.log(`   Email Config: ${process.env.EMAIL_USERNAME ? 'Configured' : 'Missing'}`);
  console.log('');

  let createdUserId = null;

  try {
    // 1. Test Health Endpoint
    console.log('1️⃣ Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed. Is the server running?');
      console.log('   Run: npm run dev');
      return;
    }

    // 2. Create Test User
    console.log('\n2️⃣ Creating test user...');
    const timestamp = Date.now();
    const userData = {
      name: 'Test User ' + timestamp,
      email: `testuser_${timestamp}@example.com`,
      mobile: '8889998899',
      password: 'TestPassword123!'
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, userData);
      console.log('✅ User registration successful:');
      console.log(`   User ID: ${registerResponse.data.user.id}`);
      console.log(`   Name: ${registerResponse.data.user.name}`);
      console.log(`   Email: ${registerResponse.data.user.email}`);
      console.log(`   Token received: ${registerResponse.data.token ? 'Yes' : 'No'}`);
      
      createdUserId = registerResponse.data.user.id;
    } catch (regError) {
      console.log('❌ User registration failed:');
      console.log(`   Status: ${regError.response?.status}`);
      console.log(`   Message: ${regError.response?.data?.message || regError.message}`);
      return;
    }

    // 3. Verify User in Database
    console.log('\n3️⃣ Verifying user in database...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      const dbUser = await User.findById(createdUserId);
      
      if (dbUser) {
        console.log('✅ User found in database:');
        console.log(`   Database ID: ${dbUser._id}`);
        console.log(`   Name: ${dbUser.name}`);
        console.log(`   Email: ${dbUser.email}`);
        console.log(`   Mobile: ${dbUser.mobile}`);
        console.log(`   Created At: ${dbUser.createdAt}`);
        console.log(`   Email Verified: ${dbUser.emailVerified}`);
        console.log(`   Has Password: ${dbUser.password ? 'Yes (encrypted)' : 'No'}`);
      } else {
        console.log('❌ User NOT found in database');
      }
    } catch (dbError) {
      console.log('❌ Database verification failed:', dbError.message);
    }

    // 4. Test Login with Created User
    console.log('\n4️⃣ Testing login with created user...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: userData.email,
        password: userData.password
      });
      console.log('✅ Login successful:');
      console.log(`   User ID: ${loginResponse.data.user.id}`);
      console.log(`   Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`);
    } catch (loginError) {
      console.log('❌ Login failed:');
      console.log(`   Status: ${loginError.response?.status}`);
      console.log(`   Message: ${loginError.response?.data?.message || loginError.message}`);
    }

    // 5. Test OTP Request (will likely fail due to email config)
    console.log('\n5️⃣ Testing OTP request...');
    try {
      const otpResponse = await axios.post(`${BASE_URL}/api/auth/send-email-otp`, {
        email: userData.email
      });
      console.log('✅ OTP request successful:', otpResponse.data.message);
    } catch (otpError) {
      console.log('❌ OTP request failed (expected due to email config):');
      console.log(`   Status: ${otpError.response?.status}`);
      console.log(`   Message: ${otpError.response?.data?.message || otpError.message}`);
    }

    // 6. Test Rate Limiting (send OTP again quickly)
    console.log('\n6️⃣ Testing rate limiting (send OTP again)...');
    try {
      const otpResponse2 = await axios.post(`${BASE_URL}/api/auth/send-email-otp`, {
        email: userData.email
      });
      console.log('⚠️ Second OTP request successful (rate limiting may not be working)');
    } catch (rateLimitError) {
      if (rateLimitError.response?.status === 429) {
        console.log('✅ Rate limiting working:', rateLimitError.response.data.message);
      } else {
        console.log('❌ Unexpected error:', rateLimitError.response?.data?.message || rateLimitError.message);
      }
    }

    // 7. Final Database Stats
    console.log('\n7️⃣ Final database statistics...');
    try {
      const totalUsers = await User.countDocuments();
      const verifiedUsers = await User.countDocuments({ emailVerified: true });
      const testUsers = await User.countDocuments({ email: { $regex: /test|example\.com/i } });
      
      console.log(`📊 Database Statistics:`);
      console.log(`   Total users: ${totalUsers}`);
      console.log(`   Verified users: ${verifiedUsers}`);
      console.log(`   Test users: ${testUsers}`);
    } catch (statsError) {
      console.log('❌ Failed to get database stats:', statsError.message);
    }

  } catch (error) {
    console.error('❌ Test workflow failed:', error.message);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n🔌 Database connection closed');
    } catch (disconnectError) {
      console.log('⚠️ Error closing database connection');
    }
    console.log('\n✅ Complete workflow test finished');
  }
}

// Run the test
testCompleteWorkflow();