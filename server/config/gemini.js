const OpenAI = require("openai");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function geminiChat(prompt) {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Groq API");

    return text;
  } catch (err) {
    console.error("Groq API error:", err.message);
    throw new Error(`Groq API failed: ${err.message}`);
  }
}

module.exports = geminiChat;
