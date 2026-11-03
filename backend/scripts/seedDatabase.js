import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { Plan } from '../models/index.js';
import { PLANS } from '../config/plans.js';

// Load environment variables
dotenv.config();

const seedPlans = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('Cleared existing plans');

    const plans = await Plan.insertMany(PLANS);
    console.log(`✅ Seeded ${plans.length} plans successfully`);

    // Display created plans
    plans.forEach(plan => {
      console.log(`   - ${plan.title} (${plan.planCode}): ${plan.formattedPrice}/${plan.billingCycle}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedPlans();
}

export default seedPlans;