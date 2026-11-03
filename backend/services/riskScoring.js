import { RISK_QUESTIONS, RISK_CATEGORIES, categoryForScore } from '../config/riskQuestions.js';

/**
 * Validate and score answers.
 * `answers` maps question id -> option index (number), or an array of
 * indexes for the multiple-choice question.
 * Returns { score, category, details, normalized } or throws with a message.
 */
export function scoreRiskAnswers(answers) {
  if (!answers || typeof answers !== 'object') {
    throw new Error('Risk assessment answers are required');
  }
  let score = 0;
  const details = [];
  const normalized = {};
  for (const q of RISK_QUESTIONS) {
    const raw = answers[q.id];
    const picks = (Array.isArray(raw) ? raw : [raw]).map(Number);
    const valid =
      picks.length > 0 &&
      (q.multi || picks.length === 1) &&
      picks.every((i) => Number.isInteger(i) && i >= 0 && i < q.options.length);
    if (!valid) throw new Error(`Please answer: ${q.text}`);
    const unique = [...new Set(picks)].sort();
    // Multiple choice: the highest-scoring holding counts.
    const points = Math.max(...unique.map((i) => q.options[i].points));
    score += points;
    normalized[q.id] = q.multi ? unique : unique[0];
    details.push({
      id: q.id,
      question: q.text,
      answer: unique.map((i) => q.options[i].label).join(', '),
      points,
    });
  }
  const category = categoryForScore(score);
  const objective = RISK_QUESTIONS.find((q) => q.id === 'objective');
  const horizon = objective.options[normalized.objective].horizon;
  return { score, category, horizon, ...RISK_CATEGORIES[category], details, normalized };
}
