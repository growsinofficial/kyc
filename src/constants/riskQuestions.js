// The 7 questions printed in the Investment Advisory Agreement.
// Keep in sync with backend/config/riskQuestions.js (the backend scores answers;
// the points here only drive the live preview on the risk screen).
export const RISK_QUESTIONS = [
  { id: 'age', text: 'What is your age?', options: [['Less than 40', 3], ['41 – 55', 2], ['More than 55', 1]] },
  { id: 'income', text: 'What is your income per year?', options: [['Less than 10 lakhs', 1], ['10 lakhs to 50 lakhs', 2], ['Greater than 50 lakhs', 3]] },
  { id: 'outcome', text: 'Pick one outcome from your investment after 1 year', options: [['Average returns 7%, best 12%, worst −5%', 1], ['Average returns 12%, best 20%, worst −15%', 2], ['Average returns 15%, best 30%, worst −20%', 3]] },
  { id: 'invest_percent', text: 'What percent of your monthly income are you planning to invest?', options: [['Less than 20%', 1], ['20% – 50%', 2], ['More than 50%', 3]] },
  { id: 'liability_percent', text: 'What percent of your monthly income goes to loans and liabilities?', options: [['Less than 20%', 3], ['20% – 50%', 2], ['More than 50%', 1]] },
  { id: 'current_investments', text: 'Which investments do you currently hold?', multi: true, options: [['Bank FD', 1], ['Mutual Funds', 2], ['Stocks', 3]] },
  { id: 'objective', text: 'What is your investment objective?', options: [['Protect invested capital with very low chance of a loss (horizon under 2 years)', 1], ['Balance capital growth and protection (horizon 2–5 years)', 2], ['Long-term wealth creation, accepting higher short-term loss (horizon over 5 years)', 3]] },
]

export const PROFILE = {
  Conservative: { tolerance: 'Low', services: 'Comprehensive Planning and Portfolio Rebalancing', desc: 'You put protecting your capital first and prefer steady returns over growth.' },
  Moderate: { tolerance: 'Medium', services: 'Comprehensive Planning and Portfolio Rebalancing', desc: 'You balance risk and return, and accept short-term ups and downs for better gains.' },
  Aggressive: { tolerance: 'High', services: 'Comprehensive Planning, Exclusive Wealth Management and Portfolio Rebalancing', desc: 'You aim for high growth over a long horizon and accept higher volatility.' },
}

export const HORIZON = ['', 'Under 2 years', '2 to 5 years', 'Over 5 years']

export function scoreAnswers(answers) {
  let score = 0
  let answered = 0
  for (const q of RISK_QUESTIONS) {
    const a = answers[q.id]
    const picks = Array.isArray(a) ? a : a === undefined || a === null ? [] : [a]
    if (!picks.length) continue
    answered++
    score += Math.max(...picks.map((i) => q.options[i][1]))
  }
  const category = answered < 7 ? null : score <= 11 ? 'Conservative' : score <= 16 ? 'Moderate' : 'Aggressive'
  return { score, answered, category }
}
