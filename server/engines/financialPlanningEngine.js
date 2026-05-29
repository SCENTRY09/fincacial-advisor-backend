/**
 * Financial Planning Calculation Engine
 * Performs real financial reasoning instead of template-based advice
 * Generates structured insights for Gemini to explain
 */

// ============================================================================
// 1. GOAL FEASIBILITY ENGINE
// ============================================================================

function calculateGoalFeasibility(userProfile) {
  const {
    targetAmount = 0,
    goalDuration = "3–5 years",
    monthlyIncome = 0,
    monthlyExpenses = 0,
    monthlyEMI = 0,
    currentSavings = 0,
  } = userProfile;

  // Convert goal duration to months
  const durationMap = {
    "Less than 1 year": 6,
    "1–3 years": 24,
    "3–5 years": 48,
    "5–10 years": 84,
    "More than 10 years": 120,
  };
  const durationMonths = durationMap[goalDuration] || 48;

  // Calculate required monthly savings
  const requiredMonthlySavings = targetAmount / durationMonths;

  // Calculate current monthly surplus
  const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyEMI;

  // Determine feasibility
  let feasibility = "unrealistic";
  let gap = 0;
  let recommendation = [];

  if (monthlySurplus >= requiredMonthlySavings) {
    feasibility = "realistic";
  } else if (monthlySurplus > 0 && monthlySurplus >= requiredMonthlySavings * 0.5) {
    feasibility = "partially_achievable";
    gap = requiredMonthlySavings - monthlySurplus;
    recommendation = [
      `Extend goal duration to ${durationMonths * 1.5} months`,
      `Reduce target amount to ₹${Math.round(targetAmount * 0.7)}`,
      `Increase income by ₹${Math.round(gap)}`,
    ];
  } else {
    feasibility = "unrealistic";
    gap = requiredMonthlySavings - monthlySurplus;
    recommendation = [
      `Significantly extend goal duration`,
      `Reduce target amount substantially`,
      `Focus on increasing income first`,
    ];
  }

  return {
    targetAmount,
    goalDuration,
    durationMonths,
    requiredMonthlySavings: Math.round(requiredMonthlySavings),
    currentMonthlySurplus: Math.round(monthlySurplus),
    monthlyGap: Math.round(Math.max(0, gap)),
    feasibility,
    recommendation,
    achievementPercentage: Math.min(
      100,
      Math.round((monthlySurplus / requiredMonthlySavings) * 100)
    ),
  };
}

// ============================================================================
// 2. EMI SAFETY ENGINE
// ============================================================================

function calculateEMISafety(userProfile) {
  const { monthlyIncome = 0, monthlyEMI = 0 } = userProfile;

  if (monthlyIncome === 0) {
    return {
      emiRatio: 0,
      safeLimit: 0,
      status: "no_income",
      riskLevel: "unknown",
      recommendation: "Income information required",
    };
  }

  const emiRatio = (monthlyEMI / monthlyIncome) * 100;
  const safeLimit = monthlyIncome * 0.35;
  const cautionLimit = monthlyIncome * 0.5;

  let status = "safe";
  let riskLevel = "low";
  let recommendation = [];

  if (emiRatio > 50) {
    status = "dangerous";
    riskLevel = "critical";
    recommendation = [
      "EMI burden is dangerously high",
      "Consider debt consolidation",
      "Prioritize debt repayment",
      "Avoid new loans",
    ];
  } else if (emiRatio > 35) {
    status = "caution";
    riskLevel = "medium";
    recommendation = [
      "EMI is in caution zone",
      "Limit new borrowing",
      "Focus on debt reduction",
      "Build emergency fund",
    ];
  } else {
    status = "safe";
    riskLevel = "low";
    recommendation = [
      "EMI burden is manageable",
      "You can consider new loans if needed",
      "Focus on savings and investments",
    ];
  }

  return {
    monthlyIncome,
    monthlyEMI,
    emiRatio: Math.round(emiRatio * 100) / 100,
    safeLimit: Math.round(safeLimit),
    cautionLimit: Math.round(cautionLimit),
    status,
    riskLevel,
    recommendation,
    remainingCapacity: Math.round(safeLimit - monthlyEMI),
  };
}

// ============================================================================
// 3. EMERGENCY FUND ENGINE
// ============================================================================

function calculateEmergencyFund(userProfile) {
  const { monthlyExpenses = 0, currentSavings = 0 } = userProfile;

  const requiredEmergencyFund = monthlyExpenses * 6;
  const emergencyFundGap = Math.max(0, requiredEmergencyFund - currentSavings);
  const monthsOfExpensesCovered = currentSavings / monthlyExpenses;

  let readinessScore = 0;
  let status = "critical";
  let recommendation = [];

  if (monthsOfExpensesCovered >= 6) {
    readinessScore = 100;
    status = "excellent";
    recommendation = ["Emergency fund is well-established", "Focus on investments"];
  } else if (monthsOfExpensesCovered >= 3) {
    readinessScore = 50;
    status = "moderate";
    recommendation = [
      "Emergency fund is partially built",
      "Continue building to 6 months",
    ];
  } else if (monthsOfExpensesCovered >= 1) {
    readinessScore = 25;
    status = "inadequate";
    recommendation = [
      "Emergency fund is insufficient",
      "Prioritize building to 3 months first",
    ];
  } else {
    readinessScore = 0;
    status = "critical";
    recommendation = [
      "No emergency fund exists",
      "This is your top priority",
      "Start with 1 month of expenses",
    ];
  }

  return {
    monthlyExpenses,
    currentSavings,
    requiredEmergencyFund: Math.round(requiredEmergencyFund),
    emergencyFundGap: Math.round(emergencyFundGap),
    monthsOfExpensesCovered: Math.round(monthsOfExpensesCovered * 10) / 10,
    readinessScore,
    status,
    recommendation,
    monthlySavingNeeded: Math.round(emergencyFundGap / 12),
  };
}

// ============================================================================
// 4. CASH FLOW ENGINE
// ============================================================================

function calculateCashFlow(userProfile) {
  const {
    monthlyIncome = 0,
    monthlyExpenses = 0,
    monthlyEMI = 0,
    additionalIncome = 0,
  } = userProfile;

  const totalIncome = monthlyIncome + additionalIncome;
  const totalOutflow = monthlyExpenses + monthlyEMI;
  const monthlySurplus = totalIncome - totalOutflow;
  const surplusPercentage = (monthlySurplus / totalIncome) * 100;

  let cashFlowStatus = "positive";
  let recommendation = [];

  if (monthlySurplus < 0) {
    cashFlowStatus = "deficit";
    recommendation = [
      "You are spending more than you earn",
      "Reduce expenses immediately",
      "Consider additional income sources",
    ];
  } else if (monthlySurplus < totalIncome * 0.1) {
    cashFlowStatus = "tight";
    recommendation = [
      "Cash flow is tight",
      "Reduce discretionary spending",
      "Build buffer for emergencies",
    ];
  } else if (monthlySurplus < totalIncome * 0.2) {
    cashFlowStatus = "moderate";
    recommendation = [
      "Cash flow is moderate",
      "Allocate surplus to savings and investments",
    ];
  } else {
    cashFlowStatus = "healthy";
    recommendation = [
      "Cash flow is healthy",
      "Maximize savings and investments",
      "Consider wealth-building strategies",
    ];
  }

  return {
    totalIncome: Math.round(totalIncome),
    totalOutflow: Math.round(totalOutflow),
    monthlySurplus: Math.round(monthlySurplus),
    surplusPercentage: Math.round(surplusPercentage * 100) / 100,
    cashFlowStatus,
    recommendation,
    savingsPotential: Math.round(monthlySurplus * 12),
  };
}

// ============================================================================
// 5. DYNAMIC BUDGET ENGINE
// ============================================================================

function calculateDynamicBudget(userProfile) {
  const {
    monthlyIncome = 0,
    monthlyEMI = 0,
    creditCardDebt = 0,
    savingsRatio = 0,
    riskTolerance = "medium",
  } = userProfile;

  let budgetAllocation = {};
  let reasoning = [];

  // Determine profile type
  const debtBurden = (monthlyEMI / monthlyIncome) * 100;
  const hasHighDebt = debtBurden > 35;
  const hasLowIncome = monthlyIncome < 30000;
  const hasGoodSavings = savingsRatio > 20;

  if (hasHighDebt && hasLowIncome) {
    // Low income + high debt: Focus on debt repayment
    budgetAllocation = {
      needs: 70,
      wants: 10,
      savings: 10,
      investments: 10,
    };
    reasoning = [
      "High debt burden detected",
      "Prioritizing debt repayment",
      "Minimal discretionary spending",
    ];
  } else if (hasHighDebt) {
    // High debt: Focus on debt reduction
    budgetAllocation = {
      needs: 60,
      wants: 15,
      savings: 10,
      investments: 15,
    };
    reasoning = [
      "Debt burden is significant",
      "Allocating extra to debt repayment",
      "Limited investment capacity",
    ];
  } else if (hasGoodSavings && !hasLowIncome) {
    // Good savings + decent income: Aggressive investing
    budgetAllocation = {
      needs: 50,
      wants: 20,
      savings: 10,
      investments: 20,
    };
    reasoning = [
      "Strong savings history",
      "Increasing investment allocation",
      "Balanced lifestyle spending",
    ];
  } else if (hasLowIncome) {
    // Low income: Conservative approach
    budgetAllocation = {
      needs: 75,
      wants: 10,
      savings: 10,
      investments: 5,
    };
    reasoning = [
      "Lower income level",
      "Prioritizing essential expenses",
      "Building savings gradually",
    ];
  } else {
    // Standard middle income
    budgetAllocation = {
      needs: 60,
      wants: 20,
      savings: 10,
      investments: 10,
    };
    reasoning = ["Standard budget allocation", "Balanced approach"];
  }

  return {
    budgetAllocation,
    reasoning,
    monthlyAllocation: {
      needs: Math.round((monthlyIncome * budgetAllocation.needs) / 100),
      wants: Math.round((monthlyIncome * budgetAllocation.wants) / 100),
      savings: Math.round((monthlyIncome * budgetAllocation.savings) / 100),
      investments: Math.round(
        (monthlyIncome * budgetAllocation.investments) / 100
      ),
    },
  };
}

// ============================================================================
// 6. GOAL PRIORITY ENGINE
// ============================================================================

function calculateGoalPriority(userProfile) {
  const {
    monthlyEMI = 0,
    monthlyIncome = 0,
    currentSavings = 0,
    monthlyExpenses = 0,
    creditCardDebt = 0,
  } = userProfile;

  const priorities = [];

  // Emergency fund priority
  const emergencyFundGap = Math.max(0, monthlyExpenses * 6 - currentSavings);
  priorities.push({
    goal: "Emergency Fund",
    priority: emergencyFundGap > 0 ? 1 : 5,
    reason:
      emergencyFundGap > 0
        ? "Critical - No safety net"
        : "Maintained - Focus on other goals",
    urgency: emergencyFundGap > 0 ? "critical" : "low",
  });

  // Debt payoff priority
  const totalDebt = monthlyEMI * 60 + creditCardDebt; // Rough estimate
  const debtRatio = (monthlyEMI / monthlyIncome) * 100;
  priorities.push({
    goal: "Debt Payoff",
    priority: debtRatio > 35 ? 2 : 3,
    reason:
      debtRatio > 35
        ? "High debt burden - Focus on reduction"
        : "Manageable - Can balance with other goals",
    urgency: debtRatio > 35 ? "high" : "medium",
  });

  // Investments priority
  priorities.push({
    goal: "Investments",
    priority: emergencyFundGap === 0 && debtRatio < 35 ? 2 : 4,
    reason:
      emergencyFundGap === 0 && debtRatio < 35
        ? "Good foundation - Start investing"
        : "Build foundation first",
    urgency: emergencyFundGap === 0 && debtRatio < 35 ? "high" : "low",
  });

  // House purchase priority
  priorities.push({
    goal: "House Purchase",
    priority: 4,
    reason: "Long-term goal - Plan after debt and investments",
    urgency: "low",
  });

  // Vehicle purchase priority
  priorities.push({
    goal: "Vehicle Purchase",
    priority: 5,
    reason: "Discretionary - Plan after core financial goals",
    urgency: "low",
  });

  return priorities.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// 7. INVESTMENT ALLOCATION ENGINE
// ============================================================================

function calculateInvestmentAllocation(userProfile) {
  const {
    age = 30,
    riskTolerance = "medium",
    savingsRatio = 15,
    investmentExperience = "Less than 1 year",
  } = userProfile;

  let allocation = {};
  let reasoning = [];

  // Age-based allocation
  const yearsToRetirement = Math.max(0, 65 - age);
  const ageFactor = yearsToRetirement / 35; // Normalize to 0-1

  // Risk tolerance mapping
  const riskMap = {
    low: { equity: 20, debt: 50, gold: 15, emergency: 15 },
    medium: { equity: 40, debt: 35, gold: 10, emergency: 15 },
    high: { equity: 60, debt: 20, gold: 10, emergency: 10 },
  };

  let baseAllocation = riskMap[riskTolerance] || riskMap.medium;

  // Adjust based on age
  if (age < 30) {
    baseAllocation.equity += 10;
    baseAllocation.debt -= 5;
    reasoning.push("Young age - Higher equity allocation");
  } else if (age > 50) {
    baseAllocation.equity -= 10;
    baseAllocation.debt += 10;
    reasoning.push("Approaching retirement - Conservative approach");
  }

  // Adjust based on experience
  if (investmentExperience === "No experience") {
    baseAllocation.debt += 10;
    baseAllocation.equity -= 10;
    reasoning.push("Beginner investor - Conservative start");
  }

  allocation = {
    equity: Math.round(baseAllocation.equity),
    debt: Math.round(baseAllocation.debt),
    gold: Math.round(baseAllocation.gold),
    emergency: Math.round(baseAllocation.emergency),
  };

  return {
    allocation,
    reasoning,
    yearsToRetirement,
    suggestedFunds: {
      equity: ["Large Cap", "Mid Cap", "Index Funds"],
      debt: ["Liquid Funds", "Short-term Bonds"],
      gold: ["Gold ETF", "Sovereign Gold Bond"],
    },
  };
}

// ============================================================================
// 8. DEBT BURDEN ENGINE
// ============================================================================

function calculateDebtBurden(userProfile) {
  const { monthlyIncome = 0, monthlyEMI = 0, creditCardDebt = 0 } = userProfile;

  if (monthlyIncome === 0) {
    return {
      debtRatio: 0,
      status: "unknown",
      stressLevel: "unknown",
    };
  }

  const debtRatio = (monthlyEMI / monthlyIncome) * 100;
  let stressLevel = "low";
  let status = "healthy";
  let recommendation = [];

  if (debtRatio > 50) {
    stressLevel = "critical";
    status = "dangerous";
    recommendation = [
      "Debt stress is critical",
      "Immediate action required",
      "Consider debt consolidation",
      "Seek financial counseling",
    ];
  } else if (debtRatio > 35) {
    stressLevel = "high";
    status = "caution";
    recommendation = [
      "Debt stress is elevated",
      "Focus on debt reduction",
      "Limit new borrowing",
    ];
  } else if (debtRatio > 20) {
    stressLevel = "moderate";
    status = "manageable";
    recommendation = [
      "Debt is manageable",
      "Continue regular payments",
      "Build emergency fund",
    ];
  } else {
    stressLevel = "low";
    status = "healthy";
    recommendation = [
      "Debt burden is low",
      "Good financial health",
      "Focus on wealth building",
    ];
  }

  return {
    monthlyEMI,
    creditCardDebt,
    debtRatio: Math.round(debtRatio * 100) / 100,
    stressLevel,
    status,
    recommendation,
    totalDebtEstimate: Math.round(monthlyEMI * 60 + creditCardDebt),
  };
}

// ============================================================================
// 9. FINANCIAL HEALTH SCORE ENGINE
// ============================================================================

function calculateFinancialHealthScore(userProfile) {
  const {
    monthlyIncome = 0,
    monthlyExpenses = 0,
    monthlyEMI = 0,
    currentSavings = 0,
    creditCardDebt = 0,
  } = userProfile;

  let score = 0;
  let breakdown = {};
  let reasons = [];

  // Savings ratio (0-25 points)
  const savingsRatio = ((monthlyIncome - monthlyExpenses - monthlyEMI) / monthlyIncome) * 100;
  const savingsScore = Math.min(25, Math.max(0, (savingsRatio / 20) * 25));
  breakdown.savings = Math.round(savingsScore);
  if (savingsRatio < 10) reasons.push("Savings ratio is below 10%");

  // Emergency fund (0-25 points)
  const emergencyMonths = currentSavings / monthlyExpenses;
  const emergencyScore = Math.min(25, (emergencyMonths / 6) * 25);
  breakdown.emergency = Math.round(emergencyScore);
  if (emergencyMonths < 3) reasons.push("Emergency fund is insufficient");

  // Debt management (0-25 points)
  const debtRatio = (monthlyEMI / monthlyIncome) * 100;
  const debtScore = Math.max(0, 25 - (debtRatio / 2));
  breakdown.debt = Math.round(debtScore);
  if (debtRatio > 35) reasons.push("Debt burden is above safe RBI limits");

  // Credit card debt (0-25 points)
  const ccDebtScore = creditCardDebt === 0 ? 25 : Math.max(0, 25 - (creditCardDebt / 50000) * 25);
  breakdown.creditCard = Math.round(ccDebtScore);
  if (creditCardDebt > 0) reasons.push("Outstanding credit card debt detected");

  score = Math.round(
    (breakdown.savings + breakdown.emergency + breakdown.debt + breakdown.creditCard) / 4
  );

  return {
    score,
    breakdown,
    reasons,
    label:
      score >= 80
        ? "Excellent"
        : score >= 60
          ? "Good"
          : score >= 40
            ? "Fair"
            : "Poor",
  };
}

module.exports = {
  calculateGoalFeasibility,
  calculateEMISafety,
  calculateEmergencyFund,
  calculateCashFlow,
  calculateDynamicBudget,
  calculateGoalPriority,
  calculateInvestmentAllocation,
  calculateDebtBurden,
  calculateFinancialHealthScore,
};
