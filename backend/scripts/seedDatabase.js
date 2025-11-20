import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { Plan } from '../models/index.js';

// Load environment variables
dotenv.config();

const seedPlans = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('Cleared existing plans');

    // Sample plans data
    const plansData = [
      {
        name: 'Basic Plan',
        title: 'Basic Investment Plan',
        description: 'Perfect for beginners starting their investment journey with professional guidance and basic features.',
        price: 999,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          {
            name: 'Investment Advisory',
            description: 'Basic investment recommendations',
            included: true,
            limit: 'Up to ₹1 Lakh'
          },
          {
            name: 'Portfolio Tracking',
            description: 'Track your investment performance',
            included: true,
            limit: 'Basic dashboard'
          },
          {
            name: 'Customer Support',
            description: 'Email support during business hours',
            included: true,
            limit: 'Email only'
          },
          {
            name: 'Research Reports',
            description: 'Monthly market insights',
            included: true,
            limit: '1 per month'
          }
        ],
        investmentLimits: {
          minimum: 1000,
          maximum: 100000,
          recommendedRange: {
            min: 5000,
            max: 50000
          }
        },
        riskProfiles: ['Conservative', 'Moderate'],
        category: 'basic',
        isActive: true,
        isPopular: false,
        isFeatured: false,
        tagline: 'Start your investment journey',
        highlights: ['Low cost', 'Beginner friendly', 'Professional guidance'],
        benefits: [
          'Get started with as little as ₹1,000',
          'Expert curated investment recommendations',
          'Track your portfolio performance',
          'Learn investment basics with our resources'
        ],
        planCode: 'BASIC_MONTHLY',
        displayOrder: 1,
        termsAndConditions: 'Standard terms and conditions apply. Investment subject to market risks.',
        cancellationPolicy: 'Can be cancelled anytime with 30 days notice.',
        refundPolicy: 'Prorated refund available within 15 days of purchase.'
      },
      {
        name: 'Premium Plan',
        title: 'Premium Investment Plan',
        description: 'Advanced features for serious investors who want comprehensive portfolio management and premium support.',
        price: 2499,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          {
            name: 'Investment Advisory',
            description: 'Advanced investment recommendations with diversification',
            included: true,
            limit: 'Up to ₹10 Lakhs'
          },
          {
            name: 'Portfolio Management',
            description: 'Active portfolio rebalancing and optimization',
            included: true,
            limit: 'Automated rebalancing'
          },
          {
            name: 'Priority Support',
            description: '24/7 phone and chat support',
            included: true,
            limit: 'Phone & Chat'
          },
          {
            name: 'Research Reports',
            description: 'Weekly market insights and stock recommendations',
            included: true,
            limit: 'Weekly reports'
          },
          {
            name: 'Tax Planning',
            description: 'Tax optimization strategies and planning',
            included: true,
            limit: 'Included'
          },
          {
            name: 'Alternative Investments',
            description: 'Access to REITs, bonds, and other instruments',
            included: true,
            limit: 'Full access'
          }
        ],
        investmentLimits: {
          minimum: 25000,
          maximum: 1000000,
          recommendedRange: {
            min: 100000,
            max: 500000
          }
        },
        riskProfiles: ['Conservative', 'Moderate', 'Aggressive'],
        category: 'premium',
        isActive: true,
        isPopular: true,
        isFeatured: true,
        tagline: 'Comprehensive wealth management',
        highlights: ['Most popular', 'Advanced features', 'Priority support'],
        benefits: [
          'Dedicated relationship manager',
          'Advanced portfolio analytics and insights',
          'Tax optimization strategies',
          'Access to exclusive investment opportunities',
          'Regular portfolio review calls'
        ],
        planCode: 'PREMIUM_MONTHLY',
        displayOrder: 2,
        termsAndConditions: 'Premium terms and conditions apply. Investment subject to market risks.',
        cancellationPolicy: 'Can be cancelled anytime with 15 days notice.',
        refundPolicy: 'Prorated refund available within 7 days of purchase.'
      },
      {
        name: 'Enterprise Plan',
        title: 'Enterprise Investment Plan',
        description: 'Tailored solution for high-net-worth individuals and institutions with custom investment strategies.',
        price: 9999,
        currency: 'INR',
        billingCycle: 'monthly',
        features: [
          {
            name: 'Custom Investment Strategy',
            description: 'Personalized investment strategy based on your goals',
            included: true,
            limit: 'Unlimited'
          },
          {
            name: 'Dedicated Manager',
            description: 'Dedicated relationship manager and investment team',
            included: true,
            limit: 'Dedicated team'
          },
          {
            name: 'Concierge Support',
            description: 'White-glove service and instant support',
            included: true,
            limit: '24/7 concierge'
          },
          {
            name: 'Exclusive Research',
            description: 'Private research and market intelligence',
            included: true,
            limit: 'Exclusive access'
          },
          {
            name: 'Private Banking',
            description: 'Access to private banking services',
            included: true,
            limit: 'Full access'
          },
          {
            name: 'Estate Planning',
            description: 'Comprehensive estate and succession planning',
            included: true,
            limit: 'Included'
          },
          {
            name: 'Alternative Investments',
            description: 'PE, VC, hedge funds, and structured products',
            included: true,
            limit: 'Premium access'
          }
        ],
        investmentLimits: {
          minimum: 1000000,
          maximum: null, // Unlimited
          recommendedRange: {
            min: 2000000,
            max: null
          }
        },
        riskProfiles: ['Conservative', 'Moderate', 'Aggressive'],
        category: 'enterprise',
        isActive: true,
        isPopular: false,
        isFeatured: true,
        tagline: 'Elite wealth management',
        highlights: ['Premium service', 'Unlimited investment', 'Dedicated team'],
        benefits: [
          'Customized investment solutions',
          'Access to exclusive investment opportunities',
          'Regular face-to-face meetings',
          'Priority allocation in IPOs and new offerings',
          'Comprehensive wealth planning services',
          'Global investment opportunities'
        ],
        planCode: 'ENTERPRISE_MONTHLY',
        displayOrder: 3,
        termsAndConditions: 'Enterprise terms and conditions apply. Custom agreement required.',
        cancellationPolicy: 'Subject to custom agreement terms.',
        refundPolicy: 'Subject to custom agreement terms.'
      },
      {
        name: 'Annual Basic',
        title: 'Basic Plan - Annual',
        description: 'Basic investment plan with annual billing for cost savings.',
        price: 9999, // 2 months free compared to monthly
        currency: 'INR',
        billingCycle: 'yearly',
        features: [
          {
            name: 'Investment Advisory',
            description: 'Basic investment recommendations',
            included: true,
            limit: 'Up to ₹1 Lakh'
          },
          {
            name: 'Portfolio Tracking',
            description: 'Track your investment performance',
            included: true,
            limit: 'Basic dashboard'
          },
          {
            name: 'Customer Support',
            description: 'Email support during business hours',
            included: true,
            limit: 'Email only'
          },
          {
            name: 'Research Reports',
            description: 'Monthly market insights',
            included: true,
            limit: '1 per month'
          },
          {
            name: 'Annual Bonus',
            description: 'Free portfolio review and tax planning session',
            included: true,
            limit: '1 per year'
          }
        ],
        investmentLimits: {
          minimum: 1000,
          maximum: 100000,
          recommendedRange: {
            min: 5000,
            max: 50000
          }
        },
        riskProfiles: ['Conservative', 'Moderate'],
        category: 'basic',
        isActive: true,
        isPopular: false,
        isFeatured: false,
        tagline: 'Save 17% with annual billing',
        highlights: ['2 months free', 'Annual bonus session', 'Cost effective'],
        benefits: [
          'Save 17% compared to monthly billing',
          'Free annual portfolio review',
          'Priority customer support',
          'Bonus tax planning session'
        ],
        planCode: 'BASIC_YEARLY',
        displayOrder: 4,
        termsAndConditions: 'Annual payment required upfront. Standard terms apply.',
        cancellationPolicy: 'Prorated refund available after 3 months.',
        refundPolicy: 'Full refund within 30 days, prorated thereafter.'
      }
    ];

    // Insert plans
    const plans = await Plan.insertMany(plansData);
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