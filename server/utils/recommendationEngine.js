/**
 * recommendationEngine.js - Financial Recommendation Engine
 * 
 * Generates intelligent, rule-based financial recommendations based on:
 * - Financial score and breakdown
 * - Debt ratio and EMI burden
 * - Savings ratio and investment health
 * - Goals and risk tolerance
 * - Financial knowledge level
 * 
 * This system provides:
 * - Actionable priority recommendations
 * - Investment suggestions
 * - Debt management strategies
 * - Savings optimization
 * - Government scheme recommendations
 * - Personalized financial insights
 * 
 * Rule-based approach reduces AI hallucination and improves reliability.
 */

/**
 * Generate comprehensive financial recommendations
 * 
 * @param {Object} financialData - User's financial data
 * @returns {Object} Structured recommendations
 */
function generateRecommendations(financialData) {
  const {
    financialScore,
    scoreLabel,
    breakdown,
    monthlyIncome,
    monthlyExpenses,
    savings,
    existingInvestments,
    loanAmount,
    creditCardDebt,
    monthlyEMI,
    goalType,
    riskTolerance,
    investmentExperience,
    financialKnowledge,
  } = financialData;

  // Initialize recommendation structure
  const recommendations = {
    priorityActions: [],
    investmentRecommendations: [],
    debtManagement: [],
    savingsSuggestions: [],
    warnings: [],
    governmentSchemes: [],
    personalizedInsights: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      financialScore: financialScore,
      scoreLabel: scoreLabel,
    },
  };

  // Calculate key ratios
  const savingsRatio = (savings / monthlyIncome) * 100;
  const debtRatio = (monthlyEMI / monthlyIncome) * 100;
  const expenseRatio = (monthlyExpenses / monthlyIncome) * 100;
  const investmentRatio = (existingInvestments / monthlyIncome) * 100;

  // =====================================================
  // PRIORITY ACTIONS - Based on financial score
  // =====================================================

  if (financialScore < 40) {
    recommendations.priorityActions.push({
      action: "Focus on Financial Stability",
      urgency: "critical",
      description:
        "Your financial score is low. Prioritize building an emergency fund and reducing debt.",
      steps: [
        "Build emergency fund (3-6 months expenses)",
        "Reduce high-interest debt",
        "Create a realistic budget",
        "Avoid new debt",
      ],
    });
  } else if (financialScore < 60) {
    recommendations.priorityActions.push({
      action: "Improve Financial Health",
      urgency: "high",
      description:
        "Work on strengthening your financial foundation before aggressive investing.",
      steps: [
        "Increase savings rate",
        "Optimize debt repayment",
        "Build emergency fund if not present",
        "Review and reduce unnecessary expenses",
      ],
    });
  } else if (financialScore < 80) {
    recommendations.priorityActions.push({
      action: "Optimize Financial Growth",
      urgency: "medium",
      description:
        "Your finances are stable. Focus on growth and wealth building.",
      steps: [
        "Increase investment contributions",
        "Diversify investment portfolio",
        "Plan for long-term goals",
        "Consider tax-saving investments",
      ],
    });
  } else {
    recommendations.priorityActions.push({
      action: "Wealth Maximization",
      urgency: "low",
      description:
        "Your finances are excellent. Focus on wealth maximization and tax optimization.",
      steps: [
        "Diversify across asset classes",
        "Implement tax-saving strategies",
        "Plan for retirement",
        "Consider estate planning",
      ],
    });
  }

  // =====================================================
  // LOW SAVINGS ANALYSIS
  // =====================================================

  if (savingsRatio < 10) {
    recommendations.warnings.push({
      type: "critical",
      message: "Very low savings ratio",
      detail: `You're saving only ${savingsRatio.toFixed(1)}% of income. Aim for at least 20%.`,
    });

    recommendations.savingsSuggestions.push({
      suggestion: "Increase Savings Rate",
      urgency: "critical",
      target: "20-30% of income",
      actions: [
        "Review and cut unnecessary expenses",
        "Set up automatic transfers to savings",
        "Use 50-30-20 budgeting rule (50% needs, 30% wants, 20% savings)",
        "Identify discretionary spending to reduce",
      ],
    });
  } else if (savingsRatio < 20) {
    recommendations.warnings.push({
      type: "warning",
      message: "Below-average savings ratio",
      detail: `You're saving ${savingsRatio.toFixed(1)}% of income. Increase to 20%+ for better security.`,
    });

    recommendations.savingsSuggestions.push({
      suggestion: "Boost Savings",
      urgency: "high",
      target: "20-25% of income",
      actions: [
        "Reduce discretionary spending",
        "Automate savings transfers",
        "Track expenses to find savings opportunities",
      ],
    });
  } else if (savingsRatio >= 30) {
    recommendations.personalizedInsights.push({
      insight: "Excellent Savings Discipline",
      detail: `You're saving ${savingsRatio.toFixed(1)}% of income - excellent!`,
      recommendation: "Optimize these savings through strategic investments.",
    });
  }

  // =====================================================
  // HIGH DEBT ANALYSIS
  // =====================================================

  if (debtRatio > 50) {
    recommendations.warnings.push({
      type: "critical",
      message: "Excessive EMI burden",
      detail: `Your EMI is ${debtRatio.toFixed(1)}% of income. Safe limit is 40-50%.`,
    });

    recommendations.debtManagement.push({
      strategy: "Aggressive Debt Reduction",
      urgency: "critical",
      target: "Reduce EMI to <40% of income",
      actions: [
        "Prioritize high-interest debt repayment",
        "Consider debt consolidation",
        "Avoid taking new loans",
        "Increase income if possible",
        "Refinance existing loans at lower rates",
      ],
    });
  } else if (debtRatio > 40) {
    recommendations.warnings.push({
      type: "warning",
      message: "High EMI burden",
      detail: `Your EMI is ${debtRatio.toFixed(1)}% of income. Aim to reduce to <40%.`,
    });

    recommendations.debtManagement.push({
      strategy: "Optimize Debt Repayment",
      urgency: "high",
      target: "Reduce EMI to <40% of income",
      actions: [
        "Focus on high-interest debt first",
        "Consider refinancing options",
        "Avoid new debt",
        "Increase EMI payments if possible",
      ],
    });
  } else if (debtRatio < 20) {
    recommendations.personalizedInsights.push({
      insight: "Healthy Debt Level",
      detail: `Your EMI is only ${debtRatio.toFixed(1)}% of income - very manageable.`,
      recommendation: "You have room for strategic investments.",
    });
  }

  // =====================================================
  // INVESTMENT RECOMMENDATIONS
  // =====================================================

  if (investmentRatio < 5) {
    recommendations.investmentRecommendations.push({
      type: "Start Investing",
      urgency: "high",
      description: "You have minimal investments. Start building an investment portfolio.",
      suggestions: [
        {
          instrument: "SIP in Index Funds",
          amount: `₹${Math.round(monthlyIncome * 0.10)}`,
          reason: "Low cost, diversified, beginner-friendly",
          riskLevel: "Low to Medium",
        },
        {
          instrument: "PPF (Public Provident Fund)",
          amount: `₹${Math.min(150000, monthlyIncome * 1.5)}`,
          reason: "Safe, tax-free returns, government-backed",
          riskLevel: "Very Low",
        },
      ],
    });
  } else if (investmentRatio < 15) {
    recommendations.investmentRecommendations.push({
      type: "Increase Investment",
      urgency: "medium",
      description: "Increase your investment contributions for better wealth building.",
      suggestions: [
        {
          instrument: "Diversified Portfolio",
          allocation: "60% Equity, 30% Debt, 10% Gold",
          reason: "Balanced approach for medium-term growth",
          riskLevel: "Medium",
        },
      ],
    });
  } else {
    recommendations.investmentRecommendations.push({
      type: "Optimize Portfolio",
      urgency: "low",
      description: "Your investment level is good. Focus on optimization.",
      suggestions: [
        {
          instrument: "Rebalance Portfolio",
          reason: "Ensure allocation matches risk tolerance",
          riskLevel: "Depends on allocation",
        },
      ],
    });
  }

  // =====================================================
  // RISK-BASED RECOMMENDATIONS
  // =====================================================

  if (riskTolerance === "low" || riskTolerance === "conservative") {
    recommendations.investmentRecommendations.push({
      type: "Conservative Investment Strategy",
      allocation: {
        debt: "60-70%",
        equity: "20-30%",
        gold: "10%",
      },
      instruments: [
        "Fixed Deposits",
        "Government Securities",
        "Debt Mutual Funds",
        "PPF",
        "Senior Citizen Savings Scheme",
      ],
    });
  } else if (riskTolerance === "medium" || riskTolerance === "balanced") {
    recommendations.investmentRecommendations.push({
      type: "Balanced Investment Strategy",
      allocation: {
        equity: "50-60%",
        debt: "30-40%",
        gold: "10%",
      },
      instruments: [
        "Index Funds",
        "Balanced Mutual Funds",
        "Dividend Stocks",
        "Bonds",
        "Gold ETF",
      ],
    });
  } else if (riskTolerance === "high" || riskTolerance === "aggressive") {
    recommendations.investmentRecommendations.push({
      type: "Aggressive Investment Strategy",
      allocation: {
        equity: "70-80%",
        debt: "15-20%",
        gold: "5-10%",
      },
      instruments: [
        "Growth Mutual Funds",
        "Small-Cap Funds",
        "Individual Stocks",
        "Emerging Market Funds",
        "Cryptocurrency (small allocation)",
      ],
    });
  }

  // =====================================================
  // GOVERNMENT SCHEME RECOMMENDATIONS
  // =====================================================

  // Age-based recommendations
  const age = financialData.age || 35;

  if (age < 25) {
    recommendations.governmentSchemes.push({
      scheme: "Sukanya Samriddhi Yojana",
      eligibility: "If you have a daughter",
      benefit: "Tax-free returns, 7.6% interest",
      maxAmount: "₹1,50,000 per year",
      priority: "high",
    });
  }

  if (age >= 18 && age <= 50) {
    recommendations.governmentSchemes.push({
      scheme: "Atal Pension Yojana (APY)",
      eligibility: "All citizens aged 18-40",
      benefit: "Guaranteed pension from age 60",
      monthlyContribution: "₹42 to ₹210",
      priority: "high",
    });

    recommendations.governmentSchemes.push({
      scheme: "PM Jeevan Jyoti Bima Yojana",
      eligibility: "All citizens aged 18-50",
      benefit: "Life insurance coverage",
      premium: "₹436 per year",
      coverage: "₹2,00,000",
      priority: "medium",
    });

    recommendations.governmentSchemes.push({
      scheme: "PM Suraksha Bima Yojana",
      eligibility: "All citizens aged 18-70",
      benefit: "Accident insurance",
      premium: "₹12 per year",
      coverage: "₹2,00,000",
      priority: "medium",
    });
  }

  if (savingsRatio > 20) {
    recommendations.governmentSchemes.push({
      scheme: "Public Provident Fund (PPF)",
      eligibility: "All Indian citizens",
      benefit: "Tax-free returns, 7.1% interest",
      maxAmount: "₹1,50,000 per year",
      tenure: "15 years",
      priority: "high",
    });

    recommendations.governmentSchemes.push({
      scheme: "National Pension System (NPS)",
      eligibility: "All Indian citizens aged 18-60",
      benefit: "Tax benefits, retirement corpus",
      taxBenefit: "₹50,000 under 80C + ₹50,000 under 80CCD(1B)",
      priority: "high",
    });
  }

  if (loanAmount > 0) {
    recommendations.governmentSchemes.push({
      scheme: "PM Mudra Loan",
      eligibility: "Self-employed individuals",
      benefit: "Unsecured business loan",
      maxAmount: "₹10,00,000",
      interestRate: "Varies by bank",
      priority: "medium",
    });
  }

  // =====================================================
  // EXPENSE RATIO ANALYSIS
  // =====================================================

  if (expenseRatio > 80) {
    recommendations.warnings.push({
      type: "critical",
      message: "Excessive spending",
      detail: `You're spending ${expenseRatio.toFixed(1)}% of income. Reduce to <70%.`,
    });

    recommendations.savingsSuggestions.push({
      suggestion: "Implement Spending Control",
      urgency: "critical",
      actions: [
        "Track all expenses for 30 days",
        "Identify and cut non-essential spending",
        "Use budgeting apps",
        "Set spending limits per category",
        "Negotiate bills (insurance, utilities)",
      ],
    });
  } else if (expenseRatio > 70) {
    recommendations.warnings.push({
      type: "warning",
      message: "High expense ratio",
      detail: `You're spending ${expenseRatio.toFixed(1)}% of income. Aim for <70%.`,
    });
  }

  // =====================================================
  // FINANCIAL KNOWLEDGE-BASED RECOMMENDATIONS
  // =====================================================

  if (financialKnowledge === "beginner" || financialKnowledge === "low") {
    recommendations.personalizedInsights.push({
      insight: "Financial Education Priority",
      detail: "Invest time in learning financial basics.",
      resources: [
        "Learn about emergency funds",
        "Understand tax deductions (80C, 80D)",
        "Study investment basics",
        "Read about government schemes",
      ],
    });
  }

  // =====================================================
  // GOAL-BASED RECOMMENDATIONS
  // =====================================================

  if (goalType === "retirement") {
    recommendations.personalizedInsights.push({
      insight: "Retirement Planning",
      detail: "Focus on long-term wealth accumulation.",
      actions: [
        "Maximize NPS contributions",
        "Invest in PPF",
        "Build diversified portfolio",
        "Plan for inflation",
      ],
    });
  } else if (goalType === "home") {
    recommendations.personalizedInsights.push({
      insight: "Home Purchase Planning",
      detail: "Build down payment and manage home loan EMI.",
      actions: [
        "Save for down payment (20-30%)",
        "Ensure EMI < 40% of income",
        "Lock in low interest rates",
        "Plan for maintenance costs",
      ],
    });
  } else if (goalType === "education") {
    recommendations.personalizedInsights.push({
      insight: "Education Planning",
      detail: "Plan for education expenses.",
      actions: [
        "Use Sukanya Samriddhi for daughters",
        "Invest in education funds",
        "Plan for inflation in education costs",
        "Consider education loans if needed",
      ],
    });
  }

  // =====================================================
  // EMERGENCY FUND CHECK
  // =====================================================

  const emergencyFundMonths = savings / monthlyExpenses;

  if (emergencyFundMonths < 3) {
    recommendations.warnings.push({
      type: "critical",
      message: "Insufficient emergency fund",
      detail: `You have ${emergencyFundMonths.toFixed(1)} months of expenses saved. Target: 6 months.`,
    });

    recommendations.priorityActions.push({
      action: "Build Emergency Fund",
      urgency: "critical",
      description: "Create a safety net for unexpected expenses.",
      target: `₹${Math.round(monthlyExpenses * 6)}`,
      steps: [
        "Save 1 month of expenses first",
        "Then build to 3 months",
        "Finally reach 6 months target",
        "Keep in liquid savings account",
      ],
    });
  } else if (emergencyFundMonths < 6) {
    recommendations.warnings.push({
      type: "warning",
      message: "Below-target emergency fund",
      detail: `You have ${emergencyFundMonths.toFixed(1)} months of expenses saved. Target: 6 months.`,
    });
  } else {
    recommendations.personalizedInsights.push({
      insight: "Strong Emergency Fund",
      detail: `You have ${emergencyFundMonths.toFixed(1)} months of expenses saved - excellent!`,
      recommendation: "You're well-protected against financial emergencies.",
    });
  }

  // =====================================================
  // FINAL INSIGHTS
  // =====================================================

  recommendations.personalizedInsights.push({
    insight: "Your Financial Summary",
    metrics: {
      savingsRatio: `${savingsRatio.toFixed(1)}%`,
      debtRatio: `${debtRatio.toFixed(1)}%`,
      expenseRatio: `${expenseRatio.toFixed(1)}%`,
      investmentRatio: `${investmentRatio.toFixed(1)}%`,
      emergencyFund: `${emergencyFundMonths.toFixed(1)} months`,
    },
  });

  return recommendations;
}

/**
 * Helper function to calculate financial ratios
 */
function calculateRatios(financialData) {
  const { monthlyIncome, monthlyExpenses, savings, existingInvestments, monthlyEMI } =
    financialData;

  return {
    savingsRatio: (savings / monthlyIncome) * 100,
    debtRatio: (monthlyEMI / monthlyIncome) * 100,
    expenseRatio: (monthlyExpenses / monthlyIncome) * 100,
    investmentRatio: (existingInvestments / monthlyIncome) * 100,
    disposableIncome: monthlyIncome - monthlyExpenses - monthlyEMI,
  };
}

/**
 * Helper function to get urgency level
 */
function getUrgencyLevel(financialScore) {
  if (financialScore < 40) return "critical";
  if (financialScore < 60) return "high";
  if (financialScore < 80) return "medium";
  return "low";
}

/**
 * Helper function to prioritize recommendations
 */
function prioritizeRecommendations(recommendations) {
  const prioritized = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  // Collect all recommendations with urgency
  const allRecs = [
    ...recommendations.priorityActions.map((r) => ({ ...r, category: "action" })),
    ...recommendations.warnings.map((r) => ({ ...r, category: "warning" })),
    ...recommendations.debtManagement.map((r) => ({ ...r, category: "debt" })),
    ...recommendations.savingsSuggestions.map((r) => ({ ...r, category: "savings" })),
  ];

  // Sort by urgency
  allRecs.forEach((rec) => {
    const urgency = rec.urgency || "medium";
    prioritized[urgency].push(rec);
  });

  return prioritized;
}

/**
 * Export functions for use in other modules
 */
module.exports = {
  generateRecommendations,
  calculateRatios,
  getUrgencyLevel,
  prioritizeRecommendations,
};
