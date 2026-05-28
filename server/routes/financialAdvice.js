const express = require("express");
const router = express.Router();
const {
  generateFinancialAdvice,
  chatWithBot,
  getAdviceHistory,
  updateAdviceFeedback,
} = require("../controllers/financialAdviceController");
const { ensureAuthenticated, requireAuth } = require("../middlewares/AuthMiddleware");

// All financial advice routes require authentication
router.use(ensureAuthenticated);
router.use(requireAuth);

// Generate a full personalised advice report (saved to Advice collection)
// This now uses RAG pipeline instead of direct Gemini call
router.post("/generate", generateFinancialAdvice);

// Conversational chatbot — stateless, no DB write per message
router.post("/chat", chatWithBot);

// Advice history — returns all past advice records for the logged-in user
router.get("/history", getAdviceHistory);

// Feedback on a past advice record (positive / negative / neutral)
router.patch("/history/:id/feedback", updateAdviceFeedback);

module.exports = router;
