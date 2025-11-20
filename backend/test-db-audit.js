import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function auditDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count total users
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);

    // Get last 5 users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email mobile createdAt emailVerified lastOtpSentAt');

    console.log('\n📋 Recent users:');
    if (recentUsers.length === 0) {
      console.log('   No users found in database');
    } else {
      recentUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Mobile: ${user.mobile}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Email Verified: ${user.emailVerified ? '✅' : '❌'}`);
        console.log(`   Last OTP Sent: ${user.lastOtpSentAt || 'Never'}`);
        console.log('   ---');
      });
    }

    // Check for any test users
    const testUsers = await User.find({ 
      email: { $regex: /test|example\.com/i } 
    }).select('name email createdAt');

    console.log('\n🧪 Test users found:');
    if (testUsers.length === 0) {
      console.log('   No test users found');
    } else {
      testUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Database audit failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

auditDatabase();