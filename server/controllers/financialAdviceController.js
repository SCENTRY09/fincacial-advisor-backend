const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateFinancialAdvice = async (req, res) => {
  try {
    console.log("Received request:", req.body);

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
    } = req.body;

    if (
      !name ||
      !financial_goal ||
      !business_type ||
      existing_savings === undefined ||
      !risk_tolerance
    ) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields: name, financial_goal, business_type, existing_savings, risk_tolerance" });
    }

    const prompt = `You are a highly experienced financial advisor with deep expertise in personal finance, investment planning, and financial regulations. Generate a detailed, comprehensive financial advice report for ${name}.

**IMPORTANT FORMATTING INSTRUCTIONS:**
- Structure your response with clear, numbered sections (1., 2., 3., etc.)
- DO NOT use any markdown formatting symbols (asterisks, backticks, hashes, brackets)
- Use simple dash (-) or new lines for lists
- Keep paragraphs concise and scannable (2-4 sentences each)
- Use emojis appropriately (💰 💡 📊 ⚠️ ✓ 📈 🎯 🏦 📉 ⭐)
- Highlight key numbers and amounts naturally in text
- Make advice actionable and specific
- End each section with "Quick Action:" summary
- Write in a natural, human conversational style

**Client Profile:**
- Name: ${name}
- Age: ${age || 'Not provided'}
- Monthly Income: ₹${monthly_income || 'Not provided'}
- Financial Goal: ${financial_goal}
- Location: ${location || 'Not provided'}
- Language: ${preferred_language || 'English'}
- Business: ${business_type}
- Current Savings: ₹${existing_savings}
- Risk Level: ${risk_tolerance}

Provide a comprehensive financial roadmap with these EXACT sections:

1. FINANCIAL HEALTH SNAPSHOT 📊
Analyze ${name}'s current position:
- Monthly cash flow analysis
- Savings-to-income ratio  
- Emergency fund status
- Overall financial health score
Quick Action: One immediate step

2. PERSONALIZED GOAL STRATEGY 🎯
Break down ${financial_goal} into:
- Short-term milestones (0-1 year)
- Medium-term targets (1-3 years)
- Long-term objectives (3+ years)
- Specific amounts and timelines
Quick Action: First milestone to achieve

3. SMART BUDGETING PLAN 💰
Based on ₹${monthly_income} monthly income:
- Recommended expense allocation
- Areas to optimize spending
- Automated savings suggestions
- Budget tracking tips
Quick Action: Start tracking this

4. INVESTMENT ROADMAP 📈
For ${risk_tolerance} risk tolerance:
- Asset allocation percentages
- Specific investment options
- Expected returns and timeframes
- Tax-efficient investments
Quick Action: First investment to make

5. EMERGENCY & SAVINGS 🏦
Building from ₹${existing_savings}:
- Emergency fund target (3-6 months)
- Monthly savings target
- High-yield savings options
- Timeline to reach goal
Quick Action: Start this savings habit

6. RISK PROTECTION PLAN ⚠️
Safeguarding ${name}'s future:
- Essential insurance coverage
- Recommended amounts
- Monthly premium estimates
- Protection priority list
Quick Action: First insurance to get

7. TAX OPTIMIZATION 💡
Maximizing take-home income:
- Tax-saving investments (80C)
- Available deductions in ${location}
- Estimated annual savings
- Tax filing tips
Quick Action: Start this tax-saving option

8. BUSINESS FINANCE GUIDANCE 🏢
For ${business_type} business:
- Separate personal/business finances
- Business savings strategy
- Growth capital planning
- Relevant schemes and loans
Quick Action: Implement this practice

9. LOCATION-SPECIFIC BENEFITS 📍
Available in ${location}:
- Local government schemes
- Regional investment opportunities
- State-specific tax benefits
- Local financial resources
Quick Action: Apply for this scheme

10. YOUR 30-DAY ACTION PLAN ✓
Prioritized steps to start TODAY:
Week 1: - Action 1 - Action 2
Week 2: - Action 3 - Action 4
Week 3: - Action 5 - Action 6
Week 4: - Action 7 - Action 8

SUMMARY FOR ${name.toUpperCase()} ⭐
Provide 3-4 powerful sentences that highlight the most critical action, potential financial growth, and motivate ${name} to start. Include specific numbers and timeframes.

IMPORTANT: Write exclusively in ${preferred_language}. Address ${name} directly. Use simple, clear language with real numbers and calculations. Make it personal and motivating. Write in a natural, conversational style like a human advisor speaking to a client. Do NOT use markdown symbols, asterisks, or brackets. Do NOT include dates or timestamps.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("Sending request to Gemini API...");
    const result = await model.generateContent([prompt]);

    console.log("Raw API Response:", JSON.stringify(result, null, 2));

    // ✅ Fix: Properly extract response text
    const responseText =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Empty response from Gemini API");
      return res.status(500).json({ error: "Empty response from Gemini API" });
    }

    console.log("Processed Response:", responseText);

    // ✅ Fix: Send response as JSON object
    res.json({ financial_advice: responseText });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message }); // Removed the extra 'c'
  }
};

// New function for dynamic chatbot conversations
const chatWithBot = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Create a context-aware prompt for the financial chatbot
    const systemPrompt = `You are "Dhan Sarthi", a knowledgeable and friendly financial advisor specializing in Indian financial markets, government schemes, and personal finance. You help users with:

1. **Personal Finance Questions**: Budgeting, saving, investing, debt management
2. **Investment Advice**: Mutual funds, stocks, bonds, real estate, gold, etc.
3. **Government Schemes**: PM schemes, subsidies, loans, and financial assistance programs
4. **Tax Planning**: Income tax, GST, tax-saving investments
5. **Business Finance**: Small business funding, MSME schemes, business planning
6. **Financial Education**: Basic concepts, market understanding, risk management

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

    // Build conversation context
    let conversationContext = systemPrompt;
    if (conversationHistory.length > 0) {
      conversationContext += "\n\nPrevious conversation:\n";
      conversationHistory.forEach((msg, index) => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'Dhan Sarthi'}: ${msg.content}\n`;
      });
    }

    const fullPrompt = `${conversationContext}\n\nUser: ${message}\n\nDhan Sarthi:`;

    console.log("Sending chat request to Gemini API...");
    const result = await model.generateContent([fullPrompt]);

    const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Empty response from Gemini API");
      return res.status(500).json({ error: "Empty response from Gemini API" });
    }

    console.log("Chat Response:", responseText);

    res.json({ 
      response: responseText,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { generateFinancialAdvice, chatWithBot };
