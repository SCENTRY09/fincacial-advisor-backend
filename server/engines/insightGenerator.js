/**
 * Structured Insight Generator
 * Converts financial calculations into structured JSON for Gemini to explain
 */

const {
  calculateGoalFeasibility,
  calculateEMISafety,
  calculateEmergencyFund,
  calculateCashFlow,
  calculateDynamicBudget,
  calculateGoalPriority,
  calculateInvestmentAllocation,
  calculateDebtBurden,
  calculateFinancialHealthScore,
} = require('./financialPlanningEngine');

/**
 * Generate comprehensive financial insights
 * @param {Object} userProfile - User financial data
 * @returns {Object} Structured insights for Gemini
 */
function generateFinancialInsights(userProfile) {
  console.log('[INSIGHT GENERATOR] Starting financial analysis...');

  const insights = {
    timestamp: new Date().toISOString(),
    userProfile: {
      name: userProfile.name,
      age: userProfile.age,
      monthlyIncome: userProfile.monthlyIncome,
      monthlyExpenses: userProfile.monthlyExpenses,
      financialGoal: userProfile.financialGoal,
    },
    analyses: {},
    priorityActions: [],
    warnings: [],
    opportunities: [],
  };

  try {
    // 1. Financial Health Score
    console.log('[INSIGHT GENERATOR] Calculating financial health score...');
    insights.analyses.financialHealth = calculateFinancialHealthScore(userProfile);

    // 2. Cash Flow Analysis
    console.log('[INSIGHT GENERATOR] Analyzing cash flow...');
    insights.analyses.cashFlow = calculateCashFlow(userProfile);

    // 3. Emergency Fund Analysis
    console.log('[INSIGHT GENERATOR] Analyzing emergency fund...');
    insights.analyses.emergencyFund = calculateEmergencyFund(userProfile);

    // 4. EMI Safety Analysis
    console.log('[INSIGHT GENERATOR] Analyzing EMI safety...');
    insights.analyses.emiSafety = calculateEMISafety(userProfile);

    // 5. Debt Burden Analysis
    console.log('[INSIGHT GENERATOR] Analyzing debt burden...');
    insights.analyses.debtBurden = calculateDebtBurden(userProfile);

    // 6. Goal Feasibility Analysis
    console.log('[INSIGHT GENERATOR] Analyzing goal feasibility...');
    insights.analyses.goalFeasibility = calculateGoalFeasibility(userProfile);

    // 7. Dynamic Budget
    console.log('[INSIGHT GENERATOR] Generating dynamic budget...');
    insights.analyses.budgetPlan = calculateDynamicBudget(userProfile);

    // 8. Goal Priority
    console.log('[INSIGHT GENERATOR] Prioritizing goals...');
    insights.analyses.goalPriority = calculateGoalPriority(userProfile);

    // 9. Investment Allocation
    console.log('[INSIGHT GENERATOR] Calculating investment allocation...');
    insights.analyses.investmentPlan = calculateInvestmentAllocation(userProfile);

    // Generate priority actions
    insights.priorityActions = generatePriorityActions(insights.analyses);

    // Generate warnings
    insights.warnings = generateWarnings(insights.analyses);

    // Generate opportunities
    insights.opportunities = generateOpportunities(insights.analyses);

    console.log('[INSIGHT GENERATOR] Financial analysis complete');
    return insights;
  } catch (error) {
    console.error('[INSIGHT GENERATOR] Error generating insights:', error.message);
    throw error;
  }
}

/**
 * Generate priority actions based on analyses
 */
function generatePriorityActions(analyses) {
  const actions = [];

  // Emergency fund priority
  if (analyses.emergencyFund.status === 'critical') {
    actions.push({
      priority: 1,
      action: 'Build Emergency Fund',
      details: `You need ₹${analyses.emergencyFund.emergencyFundGap} to reach 6 months of expenses`,
      timeline: `${Math.ceil(analyses.emergencyFund.emergencyFundGap / (analyses.cashFlow.monthlySurplus || 1000))} months`,
      impact: 'critical',
    });
  }

  // Debt reduction priority
  if (analyses.debtBurden.stressLevel === 'critical' || analyses.debtBurden.stressLevel === 'high') {
    actions.push({
      priority: 2,
      action: 'Reduce Debt Burden',
      details: `Your EMI is ${analyses.debtBurden.debtRatio}% of income. Target: <35%`,
      timeline: 'Ongoing',
      impact: 'high',
    });
  }

  // Investment priority
  if (analyses.emergencyFund.status !== 'critical' && analyses.debtBurden.stressLevel === 'low') {
    actions.push({
      priority: 3,
      action: 'Start Investing',
      details: `Allocate ₹${analyses.budgetPlan.monthlyAllocation.investments} monthly to investments`,
      timeline: 'Immediate',
      impact: 'medium',
    });
  }

  // Goal-specific actions
  if (analyses.goalFeasibility.feasibility === 'realistic') {
    actions.push({
      priority: 4,
      action: 'Pursue Financial Goal',
      details: `Save ₹${analyses.goalFeasibility.requiredMonthlySavings} monthly to achieve your goal`,
      timeline: `${analyses.goalFeasibility.durationMonths} months`,
      impact: 'medium',
    });
  }

  return actions;
}

/**
 * Generate warnings based on analyses
 */
function generateWarnings(analyses) {
  const warnings = [];

  if (analyses.cashFlow.cashFlowStatus === 'deficit') {
    warnings.push({
      severity: 'critical',
      warning: 'Negative Cash Flow',
      message: 'You are spending more than you earn. Immediate action required.',
    });
  }

  if (analyses.emiSafety.status === 'dangerous') {
    warnings.push({
      severity: 'critical',
      warning: 'Dangerous EMI Burden',
      message: `Your EMI (${analyses.emiSafety.emiRatio}%) exceeds safe limits. Consider debt consolidation.`,
    });
  }

  if (analyses.emergencyFund.status === 'critical') {
    warnings.push({
      severity: 'high',
      warning: 'No Emergency Fund',
      message: 'You have no financial safety net. Build emergency fund immediately.',
    });
  }

  if (analyses.debtBurden.stressLevel === 'critical') {
    warnings.push({
      severity: 'high',
      warning: 'Critical Debt Stress',
      message: 'Your debt burden is unsustainable. Seek financial counseling.',
    });
  }

  if (analyses.goalFeasibility.feasibility === 'unrealistic') {
    warnings.push({
      severity: 'medium',
      warning: 'Goal Not Feasible',
      message: `Your current surplus cannot support this goal. ${analyses.goalFeasibility.recommendation[0]}`,
    });
  }

  return warnings;
}

/**
 * Generate opportunities based on analyses
 */
function generateOpportunities(analyses) {
  const opportunities = [];

  if (analyses.cashFlow.monthlySurplus > 10000) {
    opportunities.push({
      opportunity: 'Strong Savings Potential',
      details: `You can save ₹${analyses.cashFlow.savingsPotential} annually`,
      action: 'Automate savings to investment accounts',
    });
  }

  if (analyses.emergencyFund.status !== 'critical' && analyses.debtBurden.stressLevel === 'low') {
    opportunities.push({
      opportunity: 'Investment Ready',
      details: 'Your financial foundation is strong enough for investments',
      action: `Start with ₹${analyses.budgetPlan.monthlyAllocation.investments} monthly`,
    });
  }

  if (analyses.emiSafety.remainingCapacity > 5000) {
    opportunities.push({
      opportunity: 'Borrowing Capacity Available',
      details: `You can safely borrow up to ₹${analyses.emiSafety.remainingCapacity} monthly`,
      action: 'Consider for home or education loans',
    });
  }

  if (analyses.goalFeasibility.feasibility === 'partially_achievable') {
    opportunities.push({
      opportunity: 'Goal Achievable with Adjustments',
      details: `Extend timeline or reduce target to make goal achievable`,
      action: `${analyses.goalFeasibility.recommendation[0]}`,
    });
  }

  return opportunities;
}

/**
 * Generate Gemini prompt from structured insights
 */
function generateGeminiPrompt(userProfile, insights) {
  const cf  = insights.analyses.cashFlow;
  const ef  = insights.analyses.emergencyFund;
  const emi = insights.analyses.emiSafety;
  const db  = insights.analyses.debtBurden;
  const gf  = insights.analyses.goalFeasibility;
  const bp  = insights.analyses.budgetPlan;
  const ip  = insights.analyses.investmentPlan;
  const fh  = insights.analyses.financialHealth;
  const gp  = insights.analyses.goalPriority;

  const warnings     = insights.warnings.map(w => `- [${w.severity.toUpperCase()}] ${w.warning}: ${w.message}`).join('\n') || '- None';
  const opportunities = insights.opportunities.map(o => `- ${o.opportunity}: ${o.details}`).join('\n') || '- None';
  const actions      = insights.priorityActions.map(a => `- Priority ${a.priority}: ${a.action} — ${a.details} (${a.timeline})`).join('\n') || '- None';

  return `You are a certified financial planner (CFP) creating a deeply personalized financial roadmap.

USER PROFILE:
- Name: ${userProfile.name || 'User'}
- Age: ${userProfile.age || 'Not provided'}
- Occupation: ${userProfile.occupation || 'Not provided'}
- Location: ${userProfile.city || ''}, ${userProfile.state || ''}
- Monthly Income: ₹${cf.totalIncome}
- Monthly Expenses: ₹${userProfile.monthlyExpenses || 0}
- Monthly EMI: ₹${userProfile.monthlyEMI || 0}
- Current Savings: ₹${userProfile.currentSavings || 0}
- Existing Investments: ₹${userProfile.existingInvestments || 0}
- Loan Amount: ₹${userProfile.loanAmount || 0}
- Credit Card Debt: ₹${userProfile.creditCardDebt || 0}
- Financial Goal: ${userProfile.financialGoal || userProfile.goalType}
- Goal Duration: ${userProfile.goalDuration}
- Target Amount: ₹${userProfile.targetAmount || 0}
- Risk Tolerance: ${userProfile.riskTolerance}
- Investment Experience: ${userProfile.investmentExperience}

CALCULATED FINANCIAL ANALYSIS:
Financial Health Score: ${fh.score}/100 (${fh.label})
Score Breakdown: Savings=${fh.breakdown.savings}/25, Emergency=${fh.breakdown.emergency}/25, Debt=${fh.breakdown.debt}/25, CreditCard=${fh.breakdown.creditCard}/25
Score Reasons: ${fh.reasons.join('; ') || 'None'}

Cash Flow:
- Monthly Surplus: ₹${cf.monthlySurplus} (${cf.surplusPercentage}% of income)
- Status: ${cf.cashFlowStatus}
- Annual Savings Potential: ₹${cf.savingsPotential}

Emergency Fund:
- Required: ₹${ef.requiredEmergencyFund} (6 months of expenses)
- Current: ₹${ef.currentSavings}
- Gap: ₹${ef.emergencyFundGap}
- Coverage: ${ef.monthsOfExpensesCovered} months
- Status: ${ef.status}
- Monthly saving needed to close gap: ₹${ef.monthlySavingNeeded}

EMI Safety:
- EMI Ratio: ${emi.emiRatio}% of income
- Safe Limit: ₹${emi.safeLimit}/month (35% of income)
- Status: ${emi.status}
- Remaining Borrowing Capacity: ₹${emi.remainingCapacity}/month

Debt Burden:
- Debt Ratio: ${db.debtRatio}%
- Stress Level: ${db.stressLevel}
- Status: ${db.status}

Goal Feasibility:
- Target: ₹${gf.targetAmount} in ${gf.durationMonths} months
- Required Monthly Saving: ₹${gf.requiredMonthlySavings}
- Current Surplus: ₹${gf.currentMonthlySurplus}
- Gap: ₹${gf.monthlyGap}
- Feasibility: ${gf.feasibility}
- Achievement %: ${gf.achievementPercentage}%

Recommended Budget Allocation:
- Needs: ${bp.budgetAllocation.needs}% = ₹${bp.monthlyAllocation.needs}
- Wants: ${bp.budgetAllocation.wants}% = ₹${bp.monthlyAllocation.wants}
- Savings: ${bp.budgetAllocation.savings}% = ₹${bp.monthlyAllocation.savings}
- Investments: ${bp.budgetAllocation.investments}% = ₹${bp.monthlyAllocation.investments}

Investment Allocation:
- Equity: ${ip.allocation.equity}%
- Debt: ${ip.allocation.debt}%
- Gold: ${ip.allocation.gold}%
- Emergency Reserve: ${ip.allocation.emergency}%

PRIORITY ACTIONS:
${actions}

WARNINGS:
${warnings}

OPPORTUNITIES:
${opportunities}

INSTRUCTIONS — READ CAREFULLY:
1. Use ONLY the numbers above. Do NOT invent or estimate any figures.
2. Every section MUST reference specific rupee amounts from the analysis.
3. Explain WHY each recommendation is made using the calculated ratios.
4. Advice must differ based on this user's actual scenario — not generic tips.
5. Format STRICTLY using ## for section headings (exactly two # symbols).
6. Use bullet points (- ) for all lists.
7. Use "Label: value" format for key metrics within bullets.
8. Do NOT use tables, code blocks, or HTML.
9. Be direct, specific, and scenario-driven.

REQUIRED SECTIONS (use exactly these ## headings):

## Financial Health Assessment
## Cash Flow & Surplus Analysis
## Emergency Fund Status
## Debt & EMI Analysis
## Goal Feasibility: ${userProfile.goalType || userProfile.financialGoal}
## Recommended Budget Plan
## Investment Strategy
## Priority Action Plan
## 30-Day Quick Wins

Write each section with depth. Reference actual numbers. Explain the reasoning behind every recommendation. This should read like advice from a real CFP who studied this person's finances — not a generic template.`;
}

module.exports = {
  generateFinancialInsights,
  generatePriorityActions,
  generateWarnings,
  generateOpportunities,
  generateGeminiPrompt,
};
