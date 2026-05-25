const OpenAI = require("openai");
require("dotenv").config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL = "llama-3.3-70b-versatile";

const generateFinancialAdvice = async (req, res) => {
  try {
    const {
      name, age, monthly_income, financial_goal,
      location, preferred_language, business_type,
      existing_savings, risk_tolerance,
    } = req.body;

    if (!name || !financial_goal || !business_type || existing_savings === undefined || !risk_tolerance) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `You are a highly experienced financial advisor. Generate a detailed financial advice report for ${name}.

Client Profile:
- Name: ${name}
- Age: ${age || 'Not provided'}
- Monthly Income: ₹${monthly_income || 'Not provided'}
- Financial Goal: ${financial_goal}
- Location: ${location || 'Not provided'}
- Language: ${preferred_language || 'English'}
- Business: ${business_type}
- Current Savings: ₹${existing_savings}
- Risk Level: ${risk_tolerance}

Provide advice with these sections:
1. FINANCIAL HEALTH SNAPSHOT 📊
2. PERSONALIZED GOAL STRATEGY 🎯
3. SMART BUDGETING PLAN 💰
4. INVESTMENT ROADMAP 📈
5. EMERGENCY & SAVINGS 🏦
6. RISK PROTECTION PLAN ⚠️
7. TAX OPTIMIZATION 💡
8. BUSINESS FINANCE GUIDANCE 🏢
9. LOCATION-SPECIFIC BENEFITS 📍
10. YOUR 30-DAY ACTION PLAN ✓

Write in ${preferred_language || 'English'}. Use simple language, real numbers. No markdown symbols.`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) return res.status(500).json({ error: "Empty response" });

    res.json({ financial_advice: responseText });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const chatWithBot = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const systemPrompt = `You are "Dhan Sarthi", a friendly financial advisor specializing in Indian financial markets, government schemes, and personal finance. Provide practical, actionable advice. Be conversational and concise.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) return res.status(500).json({ error: "Empty response" });

    res.json({ response: responseText, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { generateFinancialAdvice, chatWithBot };
