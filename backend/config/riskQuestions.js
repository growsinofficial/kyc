/**
 * Risk profiling questions — exactly as printed on page 1 of the
 * Investment Advisory Agreement (Risk Profiling table).
 *
 * Every answer scores 1–3 points; the total (7–21) sets the category:
 *   7–11  Conservative (Low risk)
 *   12–16 Moderate     (Medium risk)
 *   17–21 Aggressive   (High risk)
 *
 * Keep this file in sync with src/constants/riskQuestions.js in the frontend.
 */
export const RISK_QUESTIONS = [
  {
    id: 'age',
    text: 'What is your age?',
    options: [
      { label: 'Less than 40', points: 3 },
      { label: '41 – 55', points: 2 },
      { label: 'More than 55', points: 1 },
    ],
  },
  {
    id: 'income',
    text: 'What is your income per year?',
    options: [
      { label: 'Less than 10 lakhs', points: 1 },
      { label: '10 lakhs to 50 lakhs', points: 2 },
      { label: 'Greater than 50 lakhs', points: 3 },
    ],
  },
  {
    id: 'outcome',
    text: 'Pick one outcome from your investment after 1 year?',
    options: [
      { label: 'Average returns 7%, best 12%, worst −5%', points: 1 },
      { label: 'Average returns 12%, best 20%, worst −15%', points: 2 },
      { label: 'Average returns 15%, best 30%, worst −20%', points: 3 },
    ],
  },
  {
    id: 'invest_percent',
    text: 'What percent of your monthly income are you planning to invest?',
    options: [
      { label: 'Less than 20%', points: 1 },
      { label: '20% – 50%', points: 2 },
      { label: 'More than 50%', points: 3 },
    ],
  },
  {
    id: 'liability_percent',
    text: 'What percent of your monthly income do you use to pay loans and liabilities?',
    options: [
      { label: 'Less than 20%', points: 3 },
      { label: '20% – 50%', points: 2 },
      { label: 'More than 50%', points: 1 },
    ],
  },
  {
    id: 'current_investments',
    text: 'Select all the investments you currently hold (Multiple Choice)',
    multi: true,
    options: [
      { label: 'Bank FD', points: 1 },
      { label: 'Mutual Funds', points: 2 },
      { label: 'Stocks', points: 3 },
    ],
  },
  {
    id: 'objective',
    text: 'What is your investment objective?',
    options: [
      { label: 'Protect invested capital with very low chance of a loss (horizon under 2 years)', points: 1, horizon: 'Under 2 years' },
      { label: 'Balance capital growth and protection (horizon 2–5 years)', points: 2, horizon: '2 to 5 years' },
      { label: 'Long-term wealth creation, accepting higher short-term loss (horizon over 5 years)', points: 3, horizon: 'Over 5 years' },
    ],
  },
];

export const RISK_CATEGORIES = {
  Conservative: {
    tolerance: 'Low',
    services: 'Comprehensive Planning and Portfolio Rebalancing',
    remarks:
      'The client prefers capital protection and stable returns with low tolerance for volatility. Accordingly, advice will focus on capital preservation and low-risk strategies.',
  },
  Moderate: {
    tolerance: 'Medium',
    services: 'Comprehensive Planning and Portfolio Rebalancing',
    remarks:
      'The client seeks a balance between risk and return and can accept moderate short-term fluctuations. Accordingly, advice will focus on balanced, diversified strategies.',
  },
  Aggressive: {
    tolerance: 'High',
    services: 'Comprehensive Planning, Exclusive Wealth Management and Portfolio Rebalancing',
    remarks:
      'The client demonstrates strong financial capacity, high savings rate, long investment horizon, and willingness to accept volatility for higher potential returns. Accordingly, advice will focus on long-term wealth creation through high-growth equity strategies.',
  },
};

export const categoryForScore = (score) =>
  score <= 11 ? 'Conservative' : score <= 16 ? 'Moderate' : 'Aggressive';
