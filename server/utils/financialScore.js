/**
 * financialScore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Financial Health Scoring Engine
 *
 * Produces a 0–100 composite score from a user's financial profile.
 * Each factor is scored independently, weighted, then summed.
 *
 * WHY THIS MATTERS FOR AI SYSTEMS
 * ─────────────────────────────────
 * 1. Structured numeric signal — the score and sub-scores become feature
 *    vectors that can be fed directly into ML models (risk prediction,
 *    churn, recommendation ranking).
 * 2. Explainability — strengths/weaknesses/insights give the LLM concrete
 *    facts to reference instead of hallucinating financial context.
 * 3. Personalisation — the chatbot can open every conversation with
 *    "Your financial health score is 72 (Good). Here's what's driving it…"
 * 4. Future fine-tuning — (inputData + score + feedback) triples become
 *    labelled training samples for a fine-tuned financial advisor model.
 *
 * SCORING ARCHITECTURE
 * ─────────────────────
 * Five independent factors, each scored 0–100, then combined via weights:
 *
 *   Factor               Weight
 *   ─────────────────    ──────
 *   Savings Ratio         30 %
 *   Expense Ratio         25 %
 *   Debt Ratio            20 %
 *   EMI Burden            15 %
 *   Investment Health     10 %
 *                        ─────
 *   Total                100 %
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEIGHTS = {
  savingsRatio:      0.30,
  expenseRatio:      0.25,
  debtRatio:         0.20,
  emiBurden:         0.15,
  investmentHealth:  0.10,
};

// Score label thresholds (inclusive lower bound)
const SCORE_LABELS = [
  { min: 80, label: 'Excellent' },
  { min: 60, label: 'Good'      },
  { min: 40, label: 'Average'   },
  { min:  0, label: 'Poor'      },
];

// ─── Safe arithmetic helpers ──────────────────────────────────────────────────

/**
 * Clamp a value between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safe division — returns 0 when the divisor is 0 or falsy.
 * Prevents NaN / Infinity from propagating through the scoring pipeline.
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number}
 */
function safeDivide(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Coerce a value to a non-negative finite number.
 * Treats null / undefined / NaN / negative values as 0.
 * @param {*} value
 * @returns {number}
 */
function toPositiveNumber(value) {
  const n = Number(value);
  return isFinite(n) && n > 0 ? n : 0;
}

// ─── Individual factor scorers ────────────────────────────────────────────────

/**
 * SAVINGS RATIO SCORE (weight: 30%)
 *
 * Formula: savings / monthlyIncome
 *
 * Thresholds (industry standard "50/30/20 rule" adapted):
 *   ≥ 40%  → 100  (exceptional saver)
 *   30–40% →  85
 *   20–30% →  70  (meets the classic "save 20%" rule)
 *   10–20% →  50
 *    5–10% →  30
 *    0– 5% →  10
 *      0%  →   0
 *
 * @param {number} savings        Monthly savings amount
 * @param {number} monthlyIncome  Gross monthly income
 * @returns {{ score: number, ratio: number, insight: string }}
 */
function scoreSavingsRatio(savings, monthlyIncome) {
  const ratio = safeDivide(savings, monthlyIncome);
  const pct   = ratio * 100;

  let score;
  if      (pct >= 40) score = 100;
  else if (pct >= 30) score = 85;
  else if (pct >= 20) score = 70;
  else if (pct >= 10) score = 50;
  else if (pct >=  5) score = 30;
  else if (pct >   0) score = 10;
  else                score = 0;

  const insight =
    pct >= 40 ? `Exceptional savings rate of ${pct.toFixed(1)}% — well above the recommended 20%.` :
    pct >= 20 ? `Healthy savings rate of ${pct.toFixed(1)}% — meets the recommended 20% benchmark.` :
    pct >= 10 ? `Savings rate of ${pct.toFixed(1)}% is below the 20% target. Try to increase by ₹${Math.round((monthlyIncome * 0.20) - savings).toLocaleString()}/month.` :
                `Very low savings rate of ${pct.toFixed(1)}%. Building an emergency fund should be the immediate priority.`;

  return { score, ratio: parseFloat(pct.toFixed(2)), insight };
}

/**
 * EXPENSE RATIO SCORE (weight: 25%)
 *
 * Formula: monthlyExpenses / monthlyIncome
 *
 * Lower expenses relative to income = better financial control.
 *
 * Thresholds:
 *   ≤ 50%  → 100  (very lean spending)
 *   50–60% →  80
 *   60–70% →  60
 *   70–80% →  40
 *   80–90% →  20
 *    > 90% →   5  (living paycheck-to-paycheck)
 *
 * @param {number} monthlyExpenses
 * @param {number} monthlyIncome
 * @returns {{ score: number, ratio: number, insight: string }}
 */
function scoreExpenseRatio(monthlyExpenses, monthlyIncome) {
  const ratio = safeDivide(monthlyExpenses, monthlyIncome);
  const pct   = ratio * 100;

  let score;
  if      (pct <= 50) score = 100;
  else if (pct <= 60) score = 80;
  else if (pct <= 70) score = 60;
  else if (pct <= 80) score = 40;
  else if (pct <= 90) score = 20;
  else                score = 5;

  const insight =
    pct <= 50 ? `Excellent expense control — only ${pct.toFixed(1)}% of income spent on expenses.` :
    pct <= 70 ? `Moderate expense ratio of ${pct.toFixed(1)}%. Aim to bring this below 60%.` :
                `High expense ratio of ${pct.toFixed(1)}%. Review discretionary spending to free up cash flow.`;

  return { score, ratio: parseFloat(pct.toFixed(2)), insight };
}

/**
 * DEBT RATIO SCORE (weight: 20%)
 *
 * Formula: totalDebt / (monthlyIncome * 12)  — debt vs annual income
 *
 * Measures how many years of income are tied up in debt.
 *
 * Thresholds:
 *   0        → 100  (debt-free)
 *   0–0.5x   →  85  (< 6 months income)
 *   0.5–1x   →  65  (6–12 months income)
 *   1–2x     →  45  (1–2 years income)
 *   2–3x     →  25  (2–3 years income)
 *   > 3x     →   5  (severe debt burden)
 *
 * @param {number} loanAmount
 * @param {number} creditCardDebt
 * @param {number} monthlyIncome
 * @returns {{ score: number, ratio: number, insight: string }}
 */
function scoreDebtRatio(loanAmount, creditCardDebt, monthlyIncome) {
  const totalDebt  = loanAmount + creditCardDebt;
  const annualIncome = monthlyIncome * 12;
  const ratio      = safeDivide(totalDebt, annualIncome);

  let score;
  if      (totalDebt === 0) score = 100;
  else if (ratio <= 0.5)    score = 85;
  else if (ratio <= 1.0)    score = 65;
  else if (ratio <= 2.0)    score = 45;
  else if (ratio <= 3.0)    score = 25;
  else                      score = 5;

  const insight =
    totalDebt === 0 ? 'Debt-free — excellent financial position.' :
    ratio <= 0.5    ? `Low debt burden (${ratio.toFixed(2)}x annual income). Well managed.` :
    ratio <= 1.0    ? `Moderate debt of ₹${totalDebt.toLocaleString()} (${ratio.toFixed(2)}x annual income). Focus on repayment.` :
                      `High debt of ₹${totalDebt.toLocaleString()} (${ratio.toFixed(2)}x annual income). Prioritise debt reduction before new investments.`;

  return { score, ratio: parseFloat(ratio.toFixed(3)), totalDebt, insight };
}

/**
 * EMI BURDEN SCORE (weight: 15%)
 *
 * Formula: monthlyEMI / monthlyIncome
 *
 * RBI guideline: EMI should not exceed 40–50% of net income.
 * Conservative target: keep below 30%.
 *
 * Thresholds:
 *   0        → 100
 *   0–15%    →  90
 *   15–30%   →  70  (comfortable zone)
 *   30–40%   →  45  (approaching RBI limit)
 *   40–50%   →  20  (at RBI limit)
 *   > 50%    →   5  (over-leveraged)
 *
 * @param {number} monthlyEMI
 * @param {number} monthlyIncome
 * @returns {{ score: number, ratio: number, insight: string }}
 */
function scoreEmiBurden(monthlyEMI, monthlyIncome) {
  const ratio = safeDivide(monthlyEMI, monthlyIncome);
  const pct   = ratio * 100;

  let score;
  if      (monthlyEMI === 0) score = 100;
  else if (pct <= 15)        score = 90;
  else if (pct <= 30)        score = 70;
  else if (pct <= 40)        score = 45;
  else if (pct <= 50)        score = 20;
  else                       score = 5;

  const insight =
    monthlyEMI === 0 ? 'No EMI obligations — maximum cash flow flexibility.' :
    pct <= 30        ? `EMI burden of ${pct.toFixed(1)}% is within the safe zone (< 30%).` :
    pct <= 50        ? `EMI burden of ${pct.toFixed(1)}% is high. Avoid taking on new loans until existing EMIs reduce.` :
                       `EMI burden of ${pct.toFixed(1)}% exceeds safe limits. Consider loan restructuring or prepayment.`;

  return { score, ratio: parseFloat(pct.toFixed(2)), insight };
}

/**
 * INVESTMENT HEALTH SCORE (weight: 10%)
 *
 * Formula: existingInvestments / (monthlyIncome * 12)
 *          — investments vs annual income (wealth accumulation ratio)
 *
 * Thresholds:
 *   0        →   0  (no investments)
 *   0–0.5x   →  30
 *   0.5–1x   →  55
 *   1–2x     →  75
 *   2–3x     →  90
 *   > 3x     → 100  (strong wealth base)
 *
 * @param {number} existingInvestments
 * @param {number} monthlyIncome
 * @returns {{ score: number, ratio: number, insight: string }}
 */
function scoreInvestmentHealth(existingInvestments, monthlyIncome) {
  const annualIncome = monthlyIncome * 12;
  const ratio        = safeDivide(existingInvestments, annualIncome);

  let score;
  if      (existingInvestments === 0) score = 0;
  else if (ratio <= 0.5)              score = 30;
  else if (ratio <= 1.0)              score = 55;
  else if (ratio <= 2.0)              score = 75;
  else if (ratio <= 3.0)              score = 90;
  else                                score = 100;

  const insight =
    existingInvestments === 0 ? 'No existing investments detected. Starting a SIP or RD would significantly improve long-term wealth.' :
    ratio <= 1.0               ? `Investment base of ₹${existingInvestments.toLocaleString()} is a good start. Aim to grow it to 2–3x annual income.` :
                                 `Strong investment portfolio of ₹${existingInvestments.toLocaleString()} (${ratio.toFixed(1)}x annual income).`;

  return { score, ratio: parseFloat(ratio.toFixed(3)), insight };
}

// ─── Score label ──────────────────────────────────────────────────────────────

/**
 * Map a numeric score to a human-readable label.
 * @param {number} score  0–100
 * @returns {string}  'Poor' | 'Average' | 'Good' | 'Excellent'
 */
function getScoreLabel(score) {
  const entry = SCORE_LABELS.find(s => score >= s.min);
  return entry ? entry.label : 'Poor';
}

// ─── Strengths / Weaknesses classifier ───────────────────────────────────────

/**
 * Derive human-readable strengths and weaknesses from factor scores.
 * A factor scoring ≥ 70 is a strength; ≤ 40 is a weakness.
 *
 * @param {{ savingsRatio, expenseRatio, debtRatio, emiBurden, investmentHealth }} factors
 * @returns {{ strengths: string[], weaknesses: string[], insights: string[] }}
 */
function classifyFactors(factors) {
  const strengths  = [];
  const weaknesses = [];
  const insights   = [];

  // Savings
  if (factors.savingsRatio.score >= 70) {
    strengths.push('Strong savings discipline — consistently setting aside income.');
  } else if (factors.savingsRatio.score <= 40) {
    weaknesses.push('Low savings rate — insufficient buffer for emergencies or goals.');
    insights.push(`Increase monthly savings by at least ₹${Math.round(factors.savingsRatio._targetGap || 0).toLocaleString()} to reach the 20% benchmark.`);
  }

  // Expenses
  if (factors.expenseRatio.score >= 70) {
    strengths.push('Well-controlled monthly expenses relative to income.');
  } else if (factors.expenseRatio.score <= 40) {
    weaknesses.push('High monthly expenses consuming most of the income.');
    insights.push('Audit discretionary spending (dining, subscriptions, entertainment) to reduce expense ratio below 70%.');
  }

  // Debt
  if (factors.debtRatio.score >= 70) {
    strengths.push(factors.debtRatio.totalDebt === 0 ? 'Completely debt-free.' : 'Low overall debt burden.');
  } else if (factors.debtRatio.score <= 40) {
    weaknesses.push('High total debt relative to annual income.');
    insights.push('Focus on clearing high-interest credit card debt first (avalanche method), then tackle loans.');
  }

  // EMI
  if (factors.emiBurden.score >= 70) {
    strengths.push('EMI obligations are within a comfortable range.');
  } else if (factors.emiBurden.score <= 40) {
    weaknesses.push('EMI burden is too high — limiting monthly cash flow.');
    insights.push('Avoid new loan commitments until existing EMIs drop below 30% of income.');
  }

  // Investments
  if (factors.investmentHealth.score >= 70) {
    strengths.push('Healthy investment portfolio building long-term wealth.');
  } else if (factors.investmentHealth.score <= 40) {
    weaknesses.push('Insufficient investment activity — wealth is not growing passively.');
    insights.push('Start a monthly SIP of even ₹500–₹1,000 in an index fund to begin compounding.');
  }

  // Universal insight if score is low overall
  if (strengths.length === 0) {
    insights.push('Focus on one improvement at a time — start with building a 3-month emergency fund.');
  }

  return { strengths, weaknesses, insights };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * calculateFinancialScore
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes a composite financial health score and returns a full diagnostic
 * report suitable for display in the UI and storage in the Advice model.
 *
 * @param {object} profile
 * @param {number|string} profile.monthlyIncome       Gross monthly income (₹)
 * @param {number|string} profile.monthlyExpenses      Total monthly expenses (₹)
 * @param {number|string} profile.savings              Monthly savings amount (₹)
 * @param {number|string} profile.existingInvestments  Current investment portfolio value (₹)
 * @param {number|string} profile.loanAmount           Outstanding loan principal (₹)
 * @param {number|string} profile.creditCardDebt       Outstanding credit card balance (₹)
 * @param {number|string} profile.monthlyEMI           Total monthly EMI payments (₹)
 *
 * @returns {{
 *   financialScore:  number,
 *   scoreLabel:      string,
 *   strengths:       string[],
 *   weaknesses:      string[],
 *   insights:        string[],
 *   breakdown: {
 *     savingsRatio:     { score, ratio, insight },
 *     expenseRatio:     { score, ratio, insight },
 *     debtRatio:        { score, ratio, totalDebt, insight },
 *     emiBurden:        { score, ratio, insight },
 *     investmentHealth: { score, ratio, insight },
 *   }
 * }}
 */
function calculateFinancialScore({
  monthlyIncome      = 0,
  monthlyExpenses    = 0,
  savings            = 0,
  existingInvestments = 0,
  loanAmount         = 0,
  creditCardDebt     = 0,
  monthlyEMI         = 0,
} = {}) {

  // ── Sanitise all inputs ──────────────────────────────────────────────────
  const income      = toPositiveNumber(monthlyIncome);
  const expenses    = toPositiveNumber(monthlyExpenses);
  const sav         = toPositiveNumber(savings);
  const investments = toPositiveNumber(existingInvestments);
  const loan        = toPositiveNumber(loanAmount);
  const ccDebt      = toPositiveNumber(creditCardDebt);
  const emi         = toPositiveNumber(monthlyEMI);

  // ── Score each factor ────────────────────────────────────────────────────
  const savingsResult     = scoreSavingsRatio(sav, income);
  const expenseResult     = scoreExpenseRatio(expenses, income);
  const debtResult        = scoreDebtRatio(loan, ccDebt, income);
  const emiResult         = scoreEmiBurden(emi, income);
  const investmentResult  = scoreInvestmentHealth(investments, income);

  // ── Weighted composite score ─────────────────────────────────────────────
  const rawScore =
    savingsResult.score    * WEIGHTS.savingsRatio     +
    expenseResult.score    * WEIGHTS.expenseRatio     +
    debtResult.score       * WEIGHTS.debtRatio        +
    emiResult.score        * WEIGHTS.emiBurden        +
    investmentResult.score * WEIGHTS.investmentHealth;

  const financialScore = clamp(Math.round(rawScore), 0, 100);
  const scoreLabel     = getScoreLabel(financialScore);

  // ── Classify strengths / weaknesses ─────────────────────────────────────
  const factors = {
    savingsRatio:     savingsResult,
    expenseRatio:     expenseResult,
    debtRatio:        debtResult,
    emiBurden:        emiResult,
    investmentHealth: investmentResult,
  };

  const { strengths, weaknesses, insights } = classifyFactors(factors);

  return {
    financialScore,
    scoreLabel,
    strengths,
    weaknesses,
    insights,
    breakdown: {
      savingsRatio:     { score: savingsResult.score,    ratio: savingsResult.ratio,    insight: savingsResult.insight    },
      expenseRatio:     { score: expenseResult.score,    ratio: expenseResult.ratio,    insight: expenseResult.insight    },
      debtRatio:        { score: debtResult.score,       ratio: debtResult.ratio,       totalDebt: debtResult.totalDebt, insight: debtResult.insight },
      emiBurden:        { score: emiResult.score,        ratio: emiResult.ratio,        insight: emiResult.insight        },
      investmentHealth: { score: investmentResult.score, ratio: investmentResult.ratio, insight: investmentResult.insight },
    },
  };
}

module.exports = {
  calculateFinancialScore,
  getScoreLabel,
  // Export individual scorers for unit testing
  scoreSavingsRatio,
  scoreExpenseRatio,
  scoreDebtRatio,
  scoreEmiBurden,
  scoreInvestmentHealth,
};
