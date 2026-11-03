// Advisory plans offered under the Investment Advisory Agreement.
// Comprehensive Planning (₹34,999, one time) is the fee printed in Annexure B.
// TODO(business): confirm the fees for Portfolio Rebalancing and
// Exclusive Wealth Management before going live (placeholders below).
const common = {
  currency: 'INR',
  isActive: true,
  termsAndConditions: 'As per the Investment Advisory Services Agreement and Annexure B.',
  cancellationPolicy: 'Either party may terminate as per clause 8 of the agreement.',
  refundPolicy: 'Proportionate refund of fees for the unexpired period on premature termination.',
};
export const PLANS = [
  {
    ...common,
    name: 'Comprehensive Planning',
    title: 'Comprehensive Planning',
    description: 'Goal-based financial planning with risk-profiled investment advice.',
    price: 34999,
    billingCycle: 'one-time',
    features: [
      { name: 'Comprehensive financial plan', included: true },
      { name: 'Risk-profiled investment advice', included: true },
    ],
    riskProfiles: ['Conservative', 'Moderate', 'Aggressive'],
    category: 'basic',
    planCode: 'COMPREHENSIVE_PLANNING',
    displayOrder: 1,
    isPopular: true,
  },
  {
    ...common,
    name: 'Portfolio Rebalancing',
    title: 'Portfolio Rebalancing',
    description: 'Periodic review and rebalancing advice for your portfolio.',
    price: 24999, // TODO(business): confirm fee
    billingCycle: 'yearly',
    features: [{ name: 'Periodic portfolio review and rebalancing advice', included: true }],
    riskProfiles: ['Conservative', 'Moderate', 'Aggressive'],
    category: 'premium',
    planCode: 'PORTFOLIO_REBALANCING',
    displayOrder: 2,
  },
  {
    ...common,
    name: 'Exclusive Wealth Management',
    title: 'Exclusive Wealth Management',
    description: 'High-growth advisory for clients with an aggressive risk profile.',
    price: 75000, // TODO(business): confirm fee
    billingCycle: 'yearly',
    features: [{ name: 'Dedicated high-growth equity advisory', included: true }],
    riskProfiles: ['Aggressive'],
    category: 'enterprise',
    planCode: 'EXCLUSIVE_WEALTH_MANAGEMENT',
    displayOrder: 3,
  },
];

