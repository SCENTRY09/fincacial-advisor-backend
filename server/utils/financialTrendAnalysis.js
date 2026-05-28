/**
 * financialTrendAnalysis.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Longitudinal Financial Intelligence Engine
 *
 * Compares a user's CURRENT financial profile against their PREVIOUS advice
 * record to produce a structured trend report: score movement, metric deltas,
 * momentum classification, achievements, and AI-injectable insights.
 *
 * This is NOT a chatbot memory system.
 * It is a time-series financial health tracker — the same concept used by
 * credit bureaus and wealth management platforms to measure client progress.
 *
 * ─── WHY THIS MATTERS ────────────────────────────────────────────────────────
 *
 * 1. REDUCES AI HALLUCINATION
 *    Without trend data, the LLM has no idea whether the user's situation
 *    improved or worsened since last time. It will generate generic advice.
 *    Injecting concrete deltas ("debt reduced by ₹25,000") forces the model
 *    to acknowledge real progress and give contextually accurate advice.
 *
 * 2. MOTIVATES USERS
 *    Showing "Your score improved from 58 → 72" is far more engaging than
 *    a static score. Behavioural finance research shows progress visibility
 *    increases financial discipline by 30–40%.
 *
 * 3. ML TRAINING SIGNAL
 *    Each trend record is a (before, after, delta) tuple. Over many users,
 *    these tuples train models to predict: "given this profile change, what
 *    is the expected score improvement?" — a core feature of robo-advisors.
 *
 * 4. CONSISTENCY SCORING
 *    Users who return multiple times and show consistent improvement get a
 *    higher consistency score — a proxy for financial discipline that no
 *    single snapshot can capture.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Momentum classification thresholds ──────────────────────────────────────
// Maps score delta to a momentum label used in the UI and prompt injection.
const MOMENTUM_LEVELS = [
  { min:  15, label: 'strong_positive',  display: 'Strong Improvement 🚀' },
  { min:   5, label: 'positive',         display: 'Improving 📈'           },
  { min:  -4, label: 'stable',           display: 'Stable ➡️'              },
  { min: -14, label: 'declining',        display: 'Declining 📉'           },
  { min: -Infinity, label: 'critical_decline', display: 'Critical Decline ⚠️' },
];

// ─── Trend direction thresholds ───────────────────────────────────────────────
// Overall trend label based on composite score delta.
const TREND_LABELS = {
  strong_positive:  'improving',
  positive:         'improving',
  stable:           'stable',
  declining:        'declining',
  critical_decline: 'declining',
};

// ─── Safe helpers ─────────────────────────────────────────────────────────────

/**
 * Coerce to a finite number, defaulting to fallback (default 0).
 * Handles null, undefined, empty string, NaN.
 */
function toNum(value, fallback = 0) {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

/**
 * Safe percentage change: ((current - previous) / |previous|) * 100
 * Returns null when previous is 0 (undefined base — avoid divide-by-zero).
 * Returns null when both are 0 (no meaningful change).
 *
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}  Percentage change, or null if incalculable
 */
function pctChange(current, previous) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return null; // Can't express % change from zero base
  return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

/**
 * Absolute delta: current - previous.
 * Rounds to nearest integer for currency values.
 */
function delta(current, previous) {
  return Math.round(current - previous);
}

/**
 * Format a rupee delta for display: "+₹25,000" or "-₹10,000"
 */
function formatRupeeDelta(d) {
  const abs = Math.abs(d).toLocaleString('en-IN');
  return d >= 0 ? `+₹${abs}` : `-₹${abs}`;
}

/**
 * Format a score delta for display: "+14 points" or "-6 points"
 */
function formatScoreDelta(d) {
  return d >= 0 ? `+${d} points` : `${d} points`;
}

// ─── Momentum classifier ──────────────────────────────────────────────────────

/**
 * Classify financial momentum from the composite score delta.
 *
 * @param {number} scoreDelta  current score minus previous score
 * @returns {{ label: string, display: string }}
 */
function classifyMomentum(scoreDelta) {
  const level = MOMENTUM_LEVELS.find(l => scoreDelta >= l.min);
  return level || MOMENTUM_LEVELS[MOMENTUM_LEVELS.length - 1];
}

// ─── Consistency score ────────────────────────────────────────────────────────

/**
 * Compute a consistency score (0–100) that rewards users who return
 * regularly and show sustained improvement.
 *
 * Formula:
 *   base = 50 (neutral)
 *   +20 if score improved
 *   +15 if debt reduced
 *   +15 if savings increased
 *   -20 if score declined significantly (> 10 points)
 *   -10 if debt increased significantly (> 20%)
 *
 * @param {object} metrics  Computed metric deltas
 * @returns {number}  0–100
 */
function computeConsistencyScore(metrics) {
  let score = 50;

  if (metrics.scoreDelta > 0)  score += 20;
  if (metrics.scoreDelta < -10) score -= 20;

  if (metrics.debtChange < 0)  score += 15;
  if (metrics.debtChangePct !== null && metrics.debtChangePct > 20) score -= 10;

  if (metrics.savingsGrowth > 0) score += 15;

  return Math.min(100, Math.max(0, score));
}

// ─── Metric extractor ─────────────────────────────────────────────────────────

/**
 * Extract all comparable numeric metrics from an Advice document.
 * Reads from both inputData (raw form values) and the stored financialScore.
 * Falls back gracefully when fields are missing.
 *
 * @param {object} adviceDoc  Mongoose Advice document (or plain object)
 * @returns {object}  Flat numeric profile
 */
function extractMetrics(adviceDoc) {
  if (!adviceDoc) return null;

  const d = adviceDoc.inputData || {};

  return {
    // Composite score (stored directly on the Advice document)
    financialScore:      toNum(adviceDoc.financialScore, null),

    // Income & expenses
    monthlyIncome:       toNum(d.monthlyIncome || d.monthly_income),
    monthlyExpenses:     toNum(d.monthlyExpenses),
    additionalIncome:    toNum(d.additionalIncome),

    // Savings & investments
    savings:             toNum(d.savings || d.existing_savings),
    existingInvestments: toNum(d.existingInvestments),

    // Debt
    loanAmount:          toNum(d.loanAmount),
    creditCardDebt:      toNum(d.creditCardDebt),
    monthlyEMI:          toNum(d.monthlyEMI),
    totalDebt:           toNum(d.loanAmount) + toNum(d.creditCardDebt),

    // Derived ratios (if available from scoreReport stored in inputData)
    savingsRatioScore:   toNum(d.savingsRatioScore,    null),
    expenseRatioScore:   toNum(d.expenseRatioScore,    null),
    debtRatioScore:      toNum(d.debtRatioScore,       null),
    emiBurdenScore:      toNum(d.emiBurdenScore,       null),
    investmentScore:     toNum(d.investmentHealthScore, null),

    // Metadata
    createdAt: adviceDoc.createdAt || null,
  };
}

// ─── Insight generators ───────────────────────────────────────────────────────

/**
 * Generate human-readable insights from metric deltas.
 * Each insight is a complete sentence suitable for display and prompt injection.
 *
 * @param {object} curr   Current metrics
 * @param {object} prev   Previous metrics
 * @param {object} d      Pre-computed deltas object
 * @returns {string[]}
 */
function generateInsights(curr, prev, d) {
  const insights = [];

  // Score movement
  if (d.scoreDelta > 0) {
    insights.push(`Your financial health score improved by ${d.scoreDelta} points (${prev.financialScore} → ${curr.financialScore}), reflecting real progress in your financial discipline.`);
  } else if (d.scoreDelta < 0) {
    insights.push(`Your financial health score declined by ${Math.abs(d.scoreDelta)} points (${prev.financialScore} → ${curr.financialScore}). Review the factors that changed since your last assessment.`);
  } else if (d.scoreDelta === 0) {
    insights.push(`Your financial health score remained stable at ${curr.financialScore}. Consistency is good — now focus on the next improvement lever.`);
  }

  // Savings
  if (d.savingsGrowth > 0) {
    insights.push(`Your savings increased by ${formatRupeeDelta(d.savingsGrowth)} since your last assessment — a strong indicator of improving financial discipline.`);
  } else if (d.savingsGrowth < 0) {
    insights.push(`Your savings decreased by ${formatRupeeDelta(Math.abs(d.savingsGrowth))}. Identify what caused this reduction and set up an automatic savings transfer to prevent recurrence.`);
  }

  // Debt
  if (d.debtChange < 0) {
    const pct = d.debtChangePct !== null ? ` (${Math.abs(d.debtChangePct)}% reduction)` : '';
    insights.push(`Total debt reduced by ${formatRupeeDelta(Math.abs(d.debtChange))}${pct} — excellent progress toward financial freedom.`);
  } else if (d.debtChange > 0) {
    insights.push(`Total debt increased by ${formatRupeeDelta(d.debtChange)} since your last assessment. Ensure new debt is for productive purposes and has a clear repayment plan.`);
  }

  // Investments
  if (d.investmentGrowth > 0) {
    insights.push(`Your investment portfolio grew by ${formatRupeeDelta(d.investmentGrowth)}, building long-term wealth passively.`);
  } else if (d.investmentGrowth < 0) {
    insights.push(`Investment value decreased by ${formatRupeeDelta(Math.abs(d.investmentGrowth))}. This may reflect market movements — avoid panic-selling and stay invested for the long term.`);
  }

  // Expenses
  if (d.expenseChange < 0) {
    insights.push(`Monthly expenses reduced by ${formatRupeeDelta(Math.abs(d.expenseChange))}, freeing up more cash flow for savings and investments.`);
  } else if (d.expenseChange > 0 && curr.monthlyIncome > 0) {
    const newExpRatio = ((curr.monthlyExpenses / curr.monthlyIncome) * 100).toFixed(1);
    insights.push(`Monthly expenses increased by ${formatRupeeDelta(d.expenseChange)}. Your expense ratio is now ${newExpRatio}% of income — monitor this closely.`);
  }

  // EMI
  if (d.emiChange < 0) {
    insights.push(`Monthly EMI obligations reduced by ${formatRupeeDelta(Math.abs(d.emiChange))}, improving your monthly cash flow flexibility.`);
  } else if (d.emiChange > 0) {
    insights.push(`Monthly EMI increased by ${formatRupeeDelta(d.emiChange)}. Ensure total EMI stays below 30% of income to maintain financial health.`);
  }

  return insights;
}

/**
 * Generate achievement badges — positive milestones worth celebrating.
 *
 * @param {object} curr
 * @param {object} prev
 * @param {object} d
 * @returns {string[]}
 */
function generateAchievements(curr, prev, d) {
  const achievements = [];

  if (d.scoreDelta >= 10) {
    achievements.push(`Financial score improved by ${d.scoreDelta} points — from ${prev.financialScore} to ${curr.financialScore}. Excellent progress!`);
  }
  if (d.scoreDelta > 0 && curr.financialScore >= 80 && prev.financialScore < 80) {
    achievements.push('Reached Excellent financial health status (score ≥ 80). Outstanding achievement!');
  }
  if (d.scoreDelta > 0 && curr.financialScore >= 60 && prev.financialScore < 60) {
    achievements.push('Crossed into Good financial health territory (score ≥ 60). Keep the momentum going!');
  }
  if (d.debtChange < 0 && Math.abs(d.debtChange) >= 10000) {
    achievements.push(`Reduced total debt by ${formatRupeeDelta(Math.abs(d.debtChange))} — a significant step toward financial freedom.`);
  }
  if (curr.totalDebt === 0 && prev.totalDebt > 0) {
    achievements.push('Became completely debt-free since your last assessment. This is a major financial milestone!');
  }
  if (d.savingsGrowth >= 10000) {
    achievements.push(`Savings grew by ${formatRupeeDelta(d.savingsGrowth)} — your emergency fund and goal corpus are strengthening.`);
  }
  if (d.investmentGrowth >= 5000) {
    achievements.push(`Investment portfolio grew by ${formatRupeeDelta(d.investmentGrowth)} — wealth is compounding in the background.`);
  }
  if (d.expenseChange < 0 && Math.abs(d.expenseChange) >= 2000) {
    achievements.push(`Reduced monthly expenses by ${formatRupeeDelta(Math.abs(d.expenseChange))} — better spending control is directly improving your financial score.`);
  }

  return achievements;
}

/**
 * Generate warnings for negative trends that need attention.
 *
 * @param {object} curr
 * @param {object} prev
 * @param {object} d
 * @returns {string[]}
 */
function generateTrendWarnings(curr, prev, d) {
  const warnings = [];

  if (d.scoreDelta <= -10) {
    warnings.push(`Financial score dropped by ${Math.abs(d.scoreDelta)} points. This is a significant decline — review what changed in your income, expenses, or debt.`);
  }
  if (d.debtChange > 20000) {
    warnings.push(`Debt increased by ${formatRupeeDelta(d.debtChange)} since your last assessment. Avoid taking on additional debt until this is addressed.`);
  }
  if (d.emiChange > 5000) {
    warnings.push(`Monthly EMI increased by ${formatRupeeDelta(d.emiChange)}. High EMI growth can quickly push your burden above the safe 30% threshold.`);
  }
  if (d.savingsGrowth < 0 && Math.abs(d.savingsGrowth) > 5000) {
    warnings.push(`Savings decreased by ${formatRupeeDelta(Math.abs(d.savingsGrowth))}. If this is a one-time event, rebuild the buffer. If recurring, review your budget.`);
  }
  if (d.expenseChange > 0 && curr.monthlyIncome > 0) {
    const expRatio = (curr.monthlyExpenses / curr.monthlyIncome) * 100;
    if (expRatio > 80) {
      warnings.push(`Expense ratio has reached ${expRatio.toFixed(1)}% of income — dangerously close to leaving no room for savings or emergencies.`);
    }
  }
  if (d.investmentGrowth === 0 && curr.existingInvestments === 0) {
    warnings.push('No investment growth detected across assessments. Inflation is eroding the real value of idle savings.');
  }

  return warnings;
}

// ─── Prompt injection builder ─────────────────────────────────────────────────

/**
 * Build a compact, LLM-ready trend context block.
 * This string is injected into the Gemini prompt so the model generates
 * progress-aware advice instead of treating every session as a first visit.
 *
 * @param {object} trendReport  Full output of analyzeFinancialTrend()
 * @returns {string}  Multi-line context block for prompt injection
 */
function buildTrendPromptContext(trendReport) {
  if (!trendReport || trendReport.isFirstAssessment) {
    return 'This is the user\'s first financial assessment. No historical comparison is available.';
  }

  const lines = [
    '--- PREVIOUS FINANCIAL TREND CONTEXT ---',
    `Overall trend: ${trendReport.trend} (momentum: ${trendReport.momentum.display})`,
    `Financial score: ${trendReport.previousScore} → ${trendReport.currentScore} (${formatScoreDelta(trendReport.scoreImprovement)})`,
  ];

  if (trendReport.debtChange !== 0) {
    lines.push(`Debt change: ${formatRupeeDelta(trendReport.debtChange)} since last assessment`);
  }
  if (trendReport.savingsGrowth !== 0) {
    lines.push(`Savings change: ${formatRupeeDelta(trendReport.savingsGrowth)} since last assessment`);
  }
  if (trendReport.investmentGrowth !== 0) {
    lines.push(`Investment change: ${formatRupeeDelta(trendReport.investmentGrowth)} since last assessment`);
  }
  if (trendReport.expenseChange !== 0) {
    lines.push(`Expense change: ${formatRupeeDelta(trendReport.expenseChange)}/month since last assessment`);
  }
  if (trendReport.emiChange !== 0) {
    lines.push(`EMI change: ${formatRupeeDelta(trendReport.emiChange)}/month since last assessment`);
  }

  if (trendReport.achievements.length > 0) {
    lines.push('Recent achievements:');
    trendReport.achievements.forEach(a => lines.push(`  - ${a}`));
  }

  if (trendReport.warnings.length > 0) {
    lines.push('Trend warnings to address:');
    trendReport.warnings.forEach(w => lines.push(`  - ${w}`));
  }

  lines.push(
    `Consistency score: ${trendReport.consistencyScore}/100`,
    `Days since last assessment: ${trendReport.daysSinceLastAssessment ?? 'unknown'}`,
    '--- END TREND CONTEXT ---',
    'Use the above trend data to generate progress-aware, personalised advice.',
    'Acknowledge improvements explicitly. Address declining metrics with specific corrective actions.',
  );

  return lines.join('\n');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * analyzeFinancialTrend
 * ─────────────────────────────────────────────────────────────────────────────
 * Compares current and previous Advice documents to produce a full trend
 * report. Safe to call with a null previousAdvice (first-time users).
 *
 * @param {object} currentAdvice   The Advice document just created/scored
 *   Required shape:
 *   {
 *     financialScore: number,
 *     inputData: { monthlyIncome, monthlyExpenses, savings, existingInvestments,
 *                  loanAmount, creditCardDebt, monthlyEMI, ... },
 *     createdAt: Date
 *   }
 *
 * @param {object|null} previousAdvice  The most recent prior Advice document
 *   Same shape as currentAdvice. Pass null for first-time users.
 *
 * @returns {{
 *   isFirstAssessment:      boolean,
 *   trend:                  string,       // 'improving' | 'stable' | 'declining'
 *   momentum:               { label, display },
 *   currentScore:           number,
 *   previousScore:          number|null,
 *   scoreImprovement:       number,       // positive = better
 *   scoreImprovementPct:    number|null,
 *   debtChange:             number,       // negative = debt reduced (good)
 *   debtChangePct:          number|null,
 *   savingsGrowth:          number,       // positive = savings increased (good)
 *   savingsGrowthPct:       number|null,
 *   investmentGrowth:       number,
 *   investmentGrowthPct:    number|null,
 *   expenseChange:          number,       // negative = expenses reduced (good)
 *   expenseChangePct:       number|null,
 *   emiChange:              number,       // negative = EMI reduced (good)
 *   emiChangePct:           number|null,
 *   consistencyScore:       number,       // 0–100
 *   daysSinceLastAssessment: number|null,
 *   insights:               string[],
 *   achievements:           string[],
 *   warnings:               string[],
 *   trendSummary:           string,
 *   promptContext:          string,       // ready for Gemini prompt injection
 * }}
 */
function analyzeFinancialTrend(currentAdvice, previousAdvice) {

  // ── First-time user: no previous record ──────────────────────────────────
  if (!previousAdvice) {
    const curr = extractMetrics(currentAdvice);
    return {
      isFirstAssessment:       true,
      trend:                   'new',
      momentum:                { label: 'new', display: 'First Assessment 🌱' },
      currentScore:            curr ? curr.financialScore : null,
      previousScore:           null,
      scoreImprovement:        0,
      scoreImprovementPct:     null,
      debtChange:              0,
      debtChangePct:           null,
      savingsGrowth:           0,
      savingsGrowthPct:        null,
      investmentGrowth:        0,
      investmentGrowthPct:     null,
      expenseChange:           0,
      expenseChangePct:        null,
      emiChange:               0,
      emiChangePct:            null,
      consistencyScore:        50,
      daysSinceLastAssessment: null,
      insights:                ['This is your first financial assessment. Complete it regularly to track your progress over time.'],
      achievements:            [],
      warnings:                [],
      trendSummary:            'Welcome! Your financial journey starts here. Return in 30–90 days to see your progress.',
      promptContext:           buildTrendPromptContext(null),
    };
  }

  // ── Extract metrics from both records ────────────────────────────────────
  const curr = extractMetrics(currentAdvice);
  const prev = extractMetrics(previousAdvice);

  if (!curr || !prev) {
    return {
      isFirstAssessment: false,
      trend: 'unknown',
      momentum: { label: 'unknown', display: 'Data Unavailable' },
      currentScore: curr ? curr.financialScore : null,
      previousScore: prev ? prev.financialScore : null,
      scoreImprovement: 0,
      insights: ['Trend analysis could not be completed due to missing data in one of the records.'],
      achievements: [],
      warnings: [],
      trendSummary: 'Insufficient data for trend analysis.',
      promptContext: 'Trend analysis unavailable due to missing data.',
    };
  }

  // ── Compute all deltas ────────────────────────────────────────────────────
  const scoreDelta       = delta(curr.financialScore,      prev.financialScore);
  const debtChange       = delta(curr.totalDebt,           prev.totalDebt);
  const savingsGrowth    = delta(curr.savings,             prev.savings);
  const investmentGrowth = delta(curr.existingInvestments, prev.existingInvestments);
  const expenseChange    = delta(curr.monthlyExpenses,     prev.monthlyExpenses);
  const emiChange        = delta(curr.monthlyEMI,          prev.monthlyEMI);

  const deltas = {
    scoreDelta,
    debtChange,
    debtChangePct:       pctChange(curr.totalDebt,           prev.totalDebt),
    savingsGrowth,
    savingsGrowthPct:    pctChange(curr.savings,             prev.savings),
    investmentGrowth,
    investmentGrowthPct: pctChange(curr.existingInvestments, prev.existingInvestments),
    expenseChange,
    expenseChangePct:    pctChange(curr.monthlyExpenses,     prev.monthlyExpenses),
    emiChange,
    emiChangePct:        pctChange(curr.monthlyEMI,          prev.monthlyEMI),
  };

  // ── Classify momentum and trend ───────────────────────────────────────────
  const momentum         = classifyMomentum(scoreDelta);
  const trend            = TREND_LABELS[momentum.label] || 'stable';
  const consistencyScore = computeConsistencyScore(deltas);

  // ── Days since last assessment ────────────────────────────────────────────
  let daysSinceLastAssessment = null;
  if (prev.createdAt && curr.createdAt) {
    const msPerDay = 1000 * 60 * 60 * 24;
    daysSinceLastAssessment = Math.round(
      (new Date(curr.createdAt) - new Date(prev.createdAt)) / msPerDay
    );
  }

  // ── Generate narrative content ────────────────────────────────────────────
  const insights     = generateInsights(curr, prev, deltas);
  const achievements = generateAchievements(curr, prev, deltas);
  const warnings     = generateTrendWarnings(curr, prev, deltas);

  // ── Trend summary sentence ────────────────────────────────────────────────
  let trendSummary;
  if (trend === 'improving') {
    trendSummary = `Overall financial condition is improving steadily. Score moved from ${prev.financialScore} to ${curr.financialScore} — keep the momentum going.`;
  } else if (trend === 'stable') {
    trendSummary = `Financial condition is stable. The score held at ${curr.financialScore}. Focus on one key improvement area to break into the next tier.`;
  } else {
    trendSummary = `Financial condition has declined since the last assessment (${prev.financialScore} → ${curr.financialScore}). Immediate attention is needed on the flagged areas.`;
  }

  // ── Assemble full report ──────────────────────────────────────────────────
  const report = {
    isFirstAssessment:       false,
    trend,
    momentum,
    currentScore:            curr.financialScore,
    previousScore:           prev.financialScore,
    scoreImprovement:        scoreDelta,
    scoreImprovementPct:     pctChange(curr.financialScore, prev.financialScore),
    debtChange,
    debtChangePct:           deltas.debtChangePct,
    savingsGrowth,
    savingsGrowthPct:        deltas.savingsGrowthPct,
    investmentGrowth,
    investmentGrowthPct:     deltas.investmentGrowthPct,
    expenseChange,
    expenseChangePct:        deltas.expenseChangePct,
    emiChange,
    emiChangePct:            deltas.emiChangePct,
    consistencyScore,
    daysSinceLastAssessment,
    insights,
    achievements,
    warnings,
    trendSummary,
    promptContext:           '',  // filled below after report is assembled
  };

  // Build prompt context from the assembled report
  report.promptContext = buildTrendPromptContext(report);

  return report;
}

module.exports = {
  analyzeFinancialTrend,
  buildTrendPromptContext,
  extractMetrics,
  classifyMomentum,
  computeConsistencyScore,
};
