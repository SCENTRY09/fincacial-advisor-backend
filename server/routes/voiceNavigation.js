const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { trackAnalytics, trackUserSession, trackError } = require('./voiceAnalytics');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Command cache for faster responses
const commandCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Command validation patterns
const COMMAND_PATTERNS = {
  greeting: /^(hello|hi|hey|greetings|good morning|good afternoon|good evening)\s+(financial\s+)?advisor/i,
  navigation: /(go\s+to|navigate\s+to|take\s+me\s+to|show\s+me|open|visit)\s+(\w+)/i,
  action: /(schedule|book|arrange|set\s+up)\s+(meeting|appointment|consultation)/i,
  help: /(help|assist|support|what\s+can\s+you\s+do)/i,
  calculator: /(calculate|calculator|compute|figure\s+out)/i,
  expenses: /(expense|spending|track|monitor|budget)/i,
  advice: /(advice|guidance|recommendation|suggestion)/i,
  learning: /(learn|study|education|knowledge|tutorial)/i
};

// Enhanced voice navigation processing endpoint
router.post('/process', trackAnalytics, async (req, res) => {
  try {
    const { command, currentPage, websiteStructure, conversationMode, userId } = req.body;

    // Input validation
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        error: 'Invalid command format',
        action: { type: 'error' },
        response: "I didn't receive a valid command. Please try again."
      });
    }

    // Sanitize command
    const sanitizedCommand = sanitizeCommand(command);
    
    // Check cache first
    const cacheKey = generateCacheKey(sanitizedCommand, currentPage, conversationMode);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Pre-process command for quick responses
    const quickResponse = processQuickCommand(sanitizedCommand, currentPage);
    if (quickResponse) {
      cacheResponse(cacheKey, quickResponse);
      return res.json(quickResponse);
    }

    // Enhanced LLM processing with retry mechanism
    const llmResponse = await processWithLLM(sanitizedCommand, currentPage, websiteStructure, conversationMode);
    
    // Validate LLM response
    const validatedResponse = validateLLMResponse(llmResponse);
    
    // Cache the response
    cacheResponse(cacheKey, validatedResponse);
    
    // Track user session and log the interaction
    if (userId) {
      trackUserSession(userId);
    }
    logInteraction(sanitizedCommand, validatedResponse, userId);

    res.json(validatedResponse);

  } catch (error) {
    console.error('Error processing voice command:', error);
    
    // Track error
    trackError(error, { command: req.body.command, userId: req.body.userId });
    
    // Enhanced error handling
    const errorResponse = handleProcessingError(error, req.body.command);
    res.status(500).json(errorResponse);
  }
});

// Enhanced LLM processing with retry mechanism
async function processWithLLM(command, currentPage, websiteStructure, conversationMode) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prompt = createEnhancedPrompt(command, currentPage, websiteStructure, conversationMode);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest-8b" });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return parseGeminiResponse(text);
    } catch (error) {
      lastError = error;
      console.warn(`LLM attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }

  throw new Error(`LLM processing failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Enhanced prompt creation
function createEnhancedPrompt(command, currentPage, websiteStructure, conversationMode) {
  return `
You are an advanced AI voice assistant for a financial advisor website. Your job is to understand natural language commands and convert them into specific actions with high accuracy.

CONTEXT:
- Current page: ${currentPage}
- User command: "${command}"
- Conversation mode: ${conversationMode ? 'true' : 'false'}
- User intent: ${analyzeUserIntent(command)}

WEBSITE STRUCTURE:
${JSON.stringify(websiteStructure, null, 2)}

INSTRUCTIONS:
1. Analyze the user's intent and context carefully
2. If it's a greeting mentioning "financial advisor", respond warmly and set conversation mode to true
3. For navigation commands, identify the most appropriate page based on context
4. For action commands, map to the correct action
5. Be conversational, helpful, and provide context-aware responses
6. If uncertain, ask for clarification rather than guessing

RESPONSE FORMAT (JSON only):
{
  "action": {
    "type": "navigate|action_name|greeting|help|error|clarification",
    "path": "/path" (only for navigate actions),
    "confidence": 0.0-1.0 (confidence level)
  },
  "response": "Your spoken response to the user",
  "conversationMode": true/false (optional),
  "suggestions": ["suggestion1", "suggestion2"] (optional)
}

EXAMPLES:
- "hello financial advisor" → greeting with welcome
- "go to calculator" → navigate to /ppf
- "I want to track expenses" → navigate to /expenses
- "help me save money" → navigate to /learn
- "schedule a meeting" → action: schedule_meeting
- "I'm not sure what you mean" → clarification request

Respond only with valid JSON:
`;
}

// Enhanced response parsing with validation
function parseGeminiResponse(text) {
  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Enhanced validation
    if (!parsed.action || !parsed.response) {
      throw new Error('Missing required fields in response');
    }

    // Validate action type
    const validActionTypes = ['navigate', 'greeting', 'help', 'error', 'clarification', 'open_chat', 'schedule_meeting', 'open_calculator', 'open_expenses', 'get_advice'];
    if (!validActionTypes.includes(parsed.action.type)) {
      throw new Error('Invalid action type');
    }

    // Add confidence if missing
    if (!parsed.action.confidence) {
      parsed.action.confidence = 0.8;
    }

    return parsed;

  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    return {
      action: { 
        type: 'error', 
        confidence: 0.0 
      },
      response: "I'm sorry, I couldn't understand that command. Could you please try again?",
      conversationMode: false
    };
  }
}

// Quick command processing for common patterns
function processQuickCommand(command, currentPage) {
  const lowerCommand = command.toLowerCase();

  // Greeting patterns
  if (COMMAND_PATTERNS.greeting.test(command)) {
    return {
      action: { type: 'greeting', confidence: 0.95 },
      response: "Hello! Welcome to Financial Advisor. I'm your AI assistant. How can I help you today? You can ask me to navigate to different pages, get financial advice, or help you with calculations.",
      conversationMode: true
    };
  }

  // Navigation patterns
  if (COMMAND_PATTERNS.navigation.test(command)) {
    const match = command.match(COMMAND_PATTERNS.navigation);
    const target = match[2];
    
    const navigationMap = {
      'home': '/',
      'calculator': '/ppf',
      'expenses': '/expenses',
      'community': '/community',
      'news': '/news',
      'learn': '/learn',
      'chatbot': '/chatbot',
      'scams': '/scams',
      'profile': '/profile',
      'login': '/login',
      'signup': '/signup'
    };

    if (navigationMap[target]) {
      return {
        action: { 
          type: 'navigate', 
          path: navigationMap[target], 
          confidence: 0.9 
        },
        response: `Taking you to the ${target} page.`,
        conversationMode: true
      };
    }
  }

  // Action patterns
  if (COMMAND_PATTERNS.action.test(command)) {
    return {
      action: { type: 'schedule_meeting', confidence: 0.9 },
      response: "I'll help you schedule a meeting with our financial advisor.",
      conversationMode: true
    };
  }

  // Help patterns
  if (COMMAND_PATTERNS.help.test(command)) {
    return {
      action: { type: 'help', confidence: 0.9 },
      response: "I can help you navigate the website, schedule meetings, get financial advice, track expenses, and more. What would you like to do?",
      conversationMode: true,
      suggestions: ["Go to calculator", "Track expenses", "Get advice", "Schedule meeting"]
    };
  }

  return null; // Let LLM handle it
}

// Command sanitization
function sanitizeCommand(command) {
  return command
    .trim()
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters except basic punctuation
    .toLowerCase();
}

// Cache management
function generateCacheKey(command, currentPage, conversationMode) {
  return `${command}:${currentPage}:${conversationMode}`;
}

function getCachedResponse(key) {
  const cached = commandCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }
  commandCache.delete(key);
  return null;
}

function cacheResponse(key, response) {
  commandCache.set(key, {
    response,
    timestamp: Date.now()
  });
}

// User intent analysis
function analyzeUserIntent(command) {
  const lowerCommand = command.toLowerCase();
  
  if (COMMAND_PATTERNS.greeting.test(command)) return 'greeting';
  if (COMMAND_PATTERNS.navigation.test(command)) return 'navigation';
  if (COMMAND_PATTERNS.action.test(command)) return 'action';
  if (COMMAND_PATTERNS.help.test(command)) return 'help';
  if (COMMAND_PATTERNS.calculator.test(command)) return 'calculation';
  if (COMMAND_PATTERNS.expenses.test(command)) return 'expense_tracking';
  if (COMMAND_PATTERNS.advice.test(command)) return 'advice';
  if (COMMAND_PATTERNS.learning.test(command)) return 'learning';
  
  return 'unknown';
}

// Enhanced error handling
function handleProcessingError(error, originalCommand) {
  const errorType = error.name || 'UnknownError';
  
  switch (errorType) {
    case 'NetworkError':
      return {
        action: { type: 'error', confidence: 0.0 },
        response: "I'm having trouble connecting to my brain right now. Please check your internet connection and try again.",
        conversationMode: false
      };
    
    case 'TimeoutError':
      return {
        action: { type: 'error', confidence: 0.0 },
        response: "I'm taking too long to process your request. Please try again in a moment.",
        conversationMode: false
      };
    
    case 'ValidationError':
      return {
        action: { type: 'clarification', confidence: 0.0 },
        response: "I didn't quite understand that. Could you please rephrase your request?",
        conversationMode: false
      };
    
    default:
      return {
        action: { type: 'error', confidence: 0.0 },
        response: "I encountered an unexpected error. Please try again or contact support if the problem persists.",
        conversationMode: false
      };
  }
}

// Response validation
function validateLLMResponse(response) {
  // Ensure required fields exist
  if (!response.action || !response.response) {
    return {
      action: { type: 'error', confidence: 0.0 },
      response: "I received an invalid response. Please try again.",
      conversationMode: false
    };
  }

  // Validate confidence level
  if (response.action.confidence < 0.3) {
    response.action.type = 'clarification';
    response.response = "I'm not quite sure what you mean. Could you please rephrase that?";
  }

  return response;
}

// Interaction logging
function logInteraction(command, response, userId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId || 'anonymous',
    command: command,
    action: response.action,
    response: response.response,
    confidence: response.action.confidence
  };

  console.log('Voice Navigation Log:', JSON.stringify(logEntry, null, 2));
  
  // In a production environment, you might want to store this in a database
  // await InteractionLog.create(logEntry);
}

// Enhanced test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Enhanced Voice Navigation API is working',
    version: '2.0.0',
    features: [
      'LLM-powered natural language processing',
      'Command caching for faster responses',
      'Quick command processing',
      'Enhanced error handling',
      'User intent analysis',
      'Response validation',
      'Interaction logging'
    ],
    availableCommands: [
      'Hello financial advisor',
      'Go to calculator',
      'Track my expenses',
      'Schedule a meeting',
      'Get financial advice',
      'Help me save money',
      'What can you do?'
    ],
    cacheStats: {
      size: commandCache.size,
      maxAge: CACHE_DURATION
    }
  });
});

// Cache management endpoint
router.get('/cache/clear', (req, res) => {
  const size = commandCache.size;
  commandCache.clear();
  res.json({ 
    message: 'Cache cleared successfully',
    clearedEntries: size
  });
});

// Cache stats endpoint
router.get('/cache/stats', (req, res) => {
  res.json({
    size: commandCache.size,
    maxAge: CACHE_DURATION,
    entries: Array.from(commandCache.keys()).slice(0, 10) // Show first 10 keys
  });
});

module.exports = router;
