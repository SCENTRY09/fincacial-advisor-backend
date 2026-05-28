const { GoogleGenerativeAI } = require("@google/generative-ai");
const Advice = require("../models/Advice");
const { calculateFinancialScore } = require("../utils/financialScore");
const { generateRecommendations } = require("../utils/recommendationEngine");
const { analyzeFinancialTrend, buildTrendPromptContext } = require("../utils/financialTrendAnalysis");
const { spawn } = require('child_process');
const path = require('path');
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Call RAG Pipeline via Python subprocess
// ─────────────────────────────────────────────────────────────────────────────
function callRAGPipeline(userProfile) {
  return new Promise((resolve, reject) => {
    console.log("\n[RAG PIPELINE] Starting RAG pipeline subprocess...");
    
    // Path to the RAG pipeline subprocess wrapper
    // ML folder is now inside server/ so path is relative to server/
    const ragSubprocessPath = path.join(__dirname, '../ML/rag/retrieval/rag_subprocess.py');
    
    // Spawn Python process — pass current environment so GEMINI_API_KEY is inherited
    const python = spawn('python', [ragSubprocessPath], { env: process.env });
    
    let output = '';
    let errorOutput = '';
    
    // Capture stdout (JSON output + warnings)
    python.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
    });
    
    // Capture stderr (logs)
    python.stderr.on('data', (data) => {
      const message = data.toString();
      console.log("[RAG PIPELINE LOG]", message.trim());
      errorOutput += message;
    });
    
    // Handle process completion
    python.on('close', (code) => {
      console.log(`[RAG PIPELINE] Process exited with code ${code}`);

      if (code === 0) {
        try {
          const trimmed = output.trim();

          if (!trimmed) {
            console.error("[RAG PIPELINE] Empty output from subprocess");
            reject(new Error('RAG pipeline returned empty output'));
            return;
          }

          // stdout should now contain ONLY the JSON line (all debug goes to stderr)
          // Try direct parse first, then fall back to bracket extraction
          let result;
          try {
            result = JSON.parse(trimmed);
          } catch (_) {
            // Fallback: extract outermost JSON object
            const jsonStart = trimmed.indexOf('{');
            const jsonEnd   = trimmed.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
              console.error("[RAG PIPELINE] No JSON object found in output");
              console.error("[RAG PIPELINE] Raw output (first 500):", trimmed.substring(0, 500));
              reject(new Error('RAG pipeline returned no JSON'));
              return;
            }
            result = JSON.parse(trimmed.substring(jsonStart, jsonEnd + 1));
          }

          console.log("[RAG PIPELINE] Successfully parsed RAG output");
          console.log(`[RAG PIPELINE] Success: ${result.success}`);
          console.log(`[RAG PIPELINE] Chunks retrieved: ${result.retrievalStats?.chunks_retrieved || 0}`);
          resolve(result);
        } catch (parseErr) {
          console.error("[RAG PIPELINE] Failed to parse output as JSON:", parseErr.message);
          console.error("[RAG PIPELINE] Raw output (first 500):", output.substring(0, 500));
          reject(new Error('RAG pipeline returned invalid JSON'));
        }
      } else {
        console.error("[RAG PIPELINE] Process failed with error:", errorOutput.substring(0, 500));
        reject(new Error(`RAG pipeline failed with exit code ${code}`));
      }
    });
    
    // Handle process errors
    python.on('error', (err) => {
      console.error("[RAG PIPELINE] Failed to start process:", err.message);
      reject(err);
    });
    
    // Send user profile to Python process
    console.log("[RAG PIPELINE] Sending user profile to pipeline...");
    python.stdin.write(JSON.stringify(userProfile));
    python.stdin.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

const VALID_RISK = ["low", "medium", "high"];
const VALID_GOAL_DURATION = [
  "Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "More than 10 years",
];
const VALID_INVESTMENT_EXP = [
  "No experience", "Less than 1 year", "1–3 years", "3–5 years", "More than 5 years",
];
const VALID_FINANCIAL_KNOWLEDGE = ["Beginner", "Intermediate", "Advanced", "Expert"];
const VALID_MARITAL = ["Single", "Married", "Divorced", "Widowed"];

function validateNumeric(val, label, required = false) {
  if (val === undefined || val === null || val === "") {
    if (required) return `${label} is required`;
    return null;
  }
  const n = Number(val);
  if (isNaN(n) || n < 0) return `${label} must be a non-negative number`;
  return null;
}

function validateAdvicePayload(body) {
  const errors = [];

  // ── Required legacy fields ──
  if (!body.name || !String(body.name).trim()) errors.push("name is required");
  if (!body.financial_goal || !String(body.financial_goal).trim()) errors.push("financial_goal is required");
  if (!body.business_type || !String(body.business_type).trim()) errors.push("business_type is required");
  if (body.existing_savings === undefined || body.existing_savings === null || body.existing_savings === "")
    errors.push("existing_savings is required");
  if (!body.risk_tolerance || !VALID_RISK.includes(body.risk_tolerance))
    errors.push(`risk_tolerance must be one of: ${VALID_RISK.join(", ")}`);

  // ── Personal ──
  if (body.maritalStatus && !VALID_MARITAL.includes(body.maritalStatus))
    errors.push(`maritalStatus must be one of: ${VALID_MARITAL.join(", ")}`);
  const depErr = validateNumeric(body.dependents, "dependents");
  if (depErr) errors.push(depErr);

  // ── Numeric income/debt/goal fields ──
  const numericChecks = [
    ["monthlyIncome", "monthlyIncome", false],
    ["additionalIncome", "additionalIncome", false],
    ["monthlyExpenses", "monthlyExpenses", false],
    ["savings", "savings", false],
    ["existingInvestments", "existingInvestments", false],
    ["loanAmount", "loanAmount", false],
    ["creditCardDebt", "creditCardDebt", false],
    ["monthlyEMI", "monthlyEMI", false],
    ["targetAmount", "targetAmount", false],
    ["existing_savings", "existing_savings", true],
  ];
  numericChecks.forEach(([key, label, req]) => {
    const err = validateNumeric(body[key], label, req);
    if (err) errors.push(err);
  });

  // ── Enum fields ──
  if (body.goalDuration && !VALID_GOAL_DURATION.includes(body.goalDuration))
    errors.push(`goalDuration must be one of: ${VALID_GOAL_DURATION.join(", ")}`);
  if (body.investmentExperience && !VALID_INVESTMENT_EXP.includes(body.investmentExperience))
    errors.push(`investmentExperience must be one of: ${VALID_INVESTMENT_EXP.join(", ")}`);
  if (body.financialKnowledge && !VALID_FINANCIAL_KNOWLEDGE.includes(body.financialKnowledge))
    errors.push(`financialKnowledge must be one of: ${VALID_FINANCIAL_KNOWLEDGE.join(", ")}`);

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────

const generateFinancialAdvice = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("RECEIVED ADVICE REQUEST FOR USER:", req.user._id);
    console.log("=".repeat(80));

    // ── Validate all incoming fields ──────────────────────────────────────────
    const validationErrors = validateAdvicePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: validationErrors });
    }

    const {
      name,
      age,
      monthly_income,
      financial_goal,
      location,
      preferred_language,
      business_type,
      existing_savings,
      risk_tolerance,
      // New structured fields
      occupation,
      maritalStatus,
      dependents,
      city,
      state,
      monthlyIncome,
      additionalIncome,
      monthlyExpenses,
      savings,
      existingInvestments,
      loanAmount,
      creditCardDebt,
      monthlyEMI,
      goalType,
      goalDuration,
      targetAmount,
      investmentExperience,
      financialKnowledge,
    } = req.body;

    // ── Calculate financial health score FIRST ──────────────────────────────
    console.log("\n[STEP 1] Calculating financial score...");
    const scoreReport = calculateFinancialScore({
      monthlyIncome:       monthlyIncome || monthly_income,
      monthlyExpenses,
      savings:             savings || existing_savings,
      existingInvestments,
      loanAmount,
      creditCardDebt,
      monthlyEMI,
    });
    console.log(`[STEP 1] Financial score: ${scoreReport.financialScore} (${scoreReport.scoreLabel})`);

    // ── Fetch previous advice for trend analysis ──────────────────────────────
    console.log("\n[STEP 2] Fetching previous advice for trend analysis...");
    let previousAdvice = null;
    try {
      previousAdvice = await Advice.findOne({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select('financialScore inputData createdAt')
        .lean();
      console.log(`[STEP 2] Previous advice found: ${previousAdvice ? 'Yes' : 'No'}`);
    } catch (fetchErr) {
      console.warn('[STEP 2] Could not fetch previous advice:', fetchErr.message);
    }

    // ── Build a lightweight current advice object for trend comparison ────────
    const currentAdviceForTrend = {
      financialScore: scoreReport.financialScore,
      inputData: {
        monthlyIncome, monthly_income, monthlyExpenses,
        savings, existing_savings, existingInvestments,
        loanAmount, creditCardDebt, monthlyEMI,
      },
      createdAt: new Date(),
    };

    const trendReport = analyzeFinancialTrend(currentAdviceForTrend, previousAdvice);
    console.log(`[STEP 2] Trend: ${trendReport.trend} | Momentum: ${trendReport.momentum.label}`);

    // ── Generate rule-based recommendations ──────────────────────────────────
    console.log("\n[STEP 3] Generating rule-based recommendations...");
    const recommendations = generateRecommendations({
      financialScore:       scoreReport.financialScore,
      scoreLabel:           scoreReport.scoreLabel,
      breakdown:            scoreReport.breakdown,
      monthlyIncome:        monthlyIncome || monthly_income,
      monthlyExpenses,
      savings:              savings || existing_savings,
      existingInvestments,
      loanAmount,
      creditCardDebt,
      monthlyEMI,
      goalType,
      riskTolerance:        risk_tolerance,
      investmentExperience,
      financialKnowledge,
    });
    
    const totalRecommendations = 
      (recommendations.priorityActions?.length || 0) +
      (recommendations.investmentRecommendations?.length || 0) +
      (recommendations.debtManagement?.length || 0) +
      (recommendations.savingsSuggestions?.length || 0) +
      (recommendations.warnings?.length || 0) +
      (recommendations.governmentSchemes?.length || 0) +
      (recommendations.personalizedInsights?.length || 0);
    
    console.log(`[STEP 3] Generated ${totalRecommendations} recommendations`);

    // ── CALL RAG PIPELINE INSTEAD OF DIRECT GEMINI ──────────────────────────
    console.log("\n[STEP 4] CALLING RAG PIPELINE (NOT DIRECT GEMINI)...");
    console.log("[STEP 4] This will run: ML models → FAISS retrieval → Context building → Gemini");
    
    const ragUserProfile = {
      name,
      age,
      occupation,
      maritalStatus,
      dependents,
      city,
      state,
      monthlyIncome: monthlyIncome || monthly_income,
      additionalIncome,
      monthlyExpenses,
      currentSavings: savings || existing_savings,
      existingInvestments,
      loanAmount,
      creditCardDebt,
      monthlyEMI,
      goalType,
      goalDuration,
      targetAmount,
      financialGoal: financial_goal,
      riskTolerance: risk_tolerance,
      investmentExperience,
      financialKnowledge,
    };

    let ragResult;
    try {
      ragResult = await callRAGPipeline(ragUserProfile);
      console.log("\n[STEP 4] RAG Pipeline completed successfully");
      console.log("[STEP 4] Retrieved sources:", ragResult.retrievedSources?.length || 0);
      console.log("[STEP 4] Chunks retrieved:", ragResult.retrievalStats?.chunks_retrieved || 0);
    } catch (ragErr) {
      console.error("\n[STEP 4] RAG Pipeline failed:", ragErr.message);
      console.log("[STEP 4] Falling back to direct Gemini call...");
      
      // Fallback: Use direct Gemini if RAG fails
      const effectiveIncome = monthlyIncome || monthly_income || "Not provided";
      const effectiveLocation = city && state ? `${city}, ${state}` : (location || "Not provided");
      const debtSummary = [
        loanAmount > 0 ? `Loan: ₹${loanAmount}` : null,
        creditCardDebt > 0 ? `Credit Card Debt: ₹${creditCardDebt}` : null,
        monthlyEMI > 0 ? `Monthly EMI: ₹${monthlyEMI}` : null,
      ].filter(Boolean).join(", ") || "None";

      const fallbackPrompt = `You are a highly experienced financial advisor. Generate a detailed financial advice report for ${name}.

**Client Profile:**
- Name: ${name}
- Age: ${age || "Not provided"}
- Occupation: ${occupation || "Not provided"}
- Location: ${effectiveLocation}
- Monthly Income: ₹${effectiveIncome}
- Monthly Expenses: ₹${monthlyExpenses || "Not provided"}
- Current Savings: ₹${savings || existing_savings}
- Total Debt: ${debtSummary}
- Financial Goal: ${financial_goal}
- Risk Tolerance: ${risk_tolerance}

Provide a comprehensive financial roadmap with these sections:
1. Financial Health Snapshot
2. Personalized Goal Strategy
3. Smart Budgeting Plan
4. Investment Roadmap
5. Emergency & Savings
6. Risk Protection Plan
7. Tax Optimization
8. Debt Management Strategy
9. 30-Day Action Plan
10. Summary

Write in simple, clear language with real numbers and calculations.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([fallbackPrompt]);
      const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      ragResult = {
        roadmap: responseText,
        retrievedSources: [],
        retrievalStats: { chunks_retrieved: 0, avg_relevance: 0 },
        financialAnalysis: {
          financialScore: scoreReport.financialScore,
          riskLevel: risk_tolerance,
          spendingBehavior: "Unknown"
        }
      };
    }

    // ── Persist advice record ────────────────────────────────────────────────
    console.log("\n[STEP 5] Saving advice record to database...");
    try {
      await Advice.create({
        userId: req.user._id,
        generatedAdvice: ragResult.roadmap || ragResult.financial_advice,
        riskScore: risk_tolerance,
        financialScore: scoreReport.financialScore,
        inputData: {
          name, age, monthly_income, financial_goal,
          location, preferred_language, business_type,
          existing_savings, risk_tolerance,
          occupation, maritalStatus, dependents, city, state,
          monthlyIncome, additionalIncome, monthlyExpenses,
          savings, existingInvestments,
          loanAmount, creditCardDebt, monthlyEMI,
          goalType, goalDuration, targetAmount,
          investmentExperience, financialKnowledge,
          savingsRatioScore:     scoreReport.breakdown.savingsRatio.score,
          expenseRatioScore:     scoreReport.breakdown.expenseRatio.score,
          debtRatioScore:        scoreReport.breakdown.debtRatio.score,
          emiBurdenScore:        scoreReport.breakdown.emiBurden.score,
          investmentHealthScore: scoreReport.breakdown.investmentHealth.score,
        },
      });
      console.log("[STEP 5] Advice record saved successfully");
    } catch (saveErr) {
      console.error("[STEP 5] Failed to save advice record:", saveErr.message);
    }

    console.log("\n" + "=".repeat(80));
    console.log("ADVICE GENERATION COMPLETE");
    console.log("=".repeat(80) + "\n");

    res.json({
      financial_advice: ragResult.roadmap || ragResult.financial_advice,
      scoreReport,
      recommendations,
      trendReport,
      retrievedSources: ragResult.retrievedSources || [],
      retrievalStats: ragResult.retrievalStats || {},
    });
  } catch (error) {
    console.error("\n[ERROR] generateFinancialAdvice failed:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/financial-advice/chat
// Stateless conversational endpoint — no DB write needed per message.
// ─────────────────────────────────────────────────────────────────────────────
const chatWithBot = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are "Dhan Sarthi", a knowledgeable and friendly financial advisor specializing in Indian financial markets, government schemes, and personal finance. You help users with:

1. Personal Finance Questions: Budgeting, saving, investing, debt management
2. Investment Advice: Mutual funds, stocks, bonds, real estate, gold, etc.
3. Government Schemes: PM schemes, subsidies, loans, and financial assistance programs
4. Tax Planning: Income tax, GST, tax-saving investments
5. Business Finance: Small business funding, MSME schemes, business planning
6. Financial Education: Basic concepts, market understanding, risk management

Guidelines:
- Provide practical, actionable advice
- Be conversational and friendly
- Keep responses concise but informative (2-4 sentences for simple questions, up to 6-8 sentences for complex topics)
- Include specific examples when relevant
- Mention relevant government schemes when applicable
- Always prioritize user's financial well-being and safety
- If you don't know something specific, suggest consulting a professional
- Use simple language that's easy to understand

Current conversation context:`;

    let conversationContext = systemPrompt;
    if (conversationHistory.length > 0) {
      conversationContext += "\n\nPrevious conversation:\n";
      conversationHistory.forEach((msg) => {
        conversationContext += `${msg.role === "user" ? "User" : "Dhan Sarthi"}: ${msg.content}\n`;
      });
    }

    const fullPrompt = `${conversationContext}\n\nUser: ${message}\n\nDhan Sarthi:`;

    console.log("Sending chat request to Gemini API for user:", req.user._id);
    const result = await model.generateContent([fullPrompt]);

    const responseText =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Empty response from Gemini API");
      return res.status(500).json({ error: "Empty response from Gemini API" });
    }

    res.json({
      response: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("chatWithBot error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/financial-advice/history
// Returns all past advice records for the logged-in user, newest first.
// ─────────────────────────────────────────────────────────────────────────────
const getAdviceHistory = async (req, res) => {
  try {
    const records = await Advice.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({ history: records });
  } catch (error) {
    console.error("getAdviceHistory error:", error.message);
    res.status(500).json({ error: "Failed to fetch advice history" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/financial-advice/history/:id/feedback
// Lets the user rate a past advice record (positive / negative / neutral).
// Used for ML training data quality.
// ─────────────────────────────────────────────────────────────────────────────
const updateAdviceFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;

    if (!["positive", "negative", "neutral"].includes(feedback)) {
      return res.status(400).json({ error: "feedback must be positive, negative, or neutral" });
    }

    // findOneAndUpdate with userId ensures users can only update their own records
    const updated = await Advice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { feedback },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Advice record not found" });
    }

    res.json({ success: true, record: updated });
  } catch (error) {
    console.error("updateAdviceFeedback error:", error.message);
    res.status(500).json({ error: "Failed to update feedback" });
  }
};

module.exports = {
  generateFinancialAdvice,
  chatWithBot,
  getAdviceHistory,
  updateAdviceFeedback,
};
