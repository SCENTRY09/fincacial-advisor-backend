/**
 * recommendationRoutes.js - API routes for financial recommendations
 * 
 * Endpoints:
 * POST /api/recommendations - Get recommendations for a user
 * GET /api/recommendations/:userId - Get saved recommendations
 * POST /api/recommendations/batch - Batch recommendations
 */

const express = require('express');
const recommendationEngine = require('../utils/recommendationEngine');

const router = express.Router();

/**
 * POST /api/recommendations
 * Generate recommendations for a user
 * 
 * Request body:
 * {
 *   financialScore: number,
 *   scoreLabel: string,
 *   breakdown: object,
 *   monthlyIncome: number,
 *   monthlyExpenses: number,
 *   savings: number,
 *   existingInvestments: number,
 *   loanAmount: number,
 *   creditCardDebt: number,
 *   monthlyEMI: number,
 *   age: number,
 *   goalType: string,
 *   riskTolerance: string,
 *   investmentExperience: string,
 *   financialKnowledge: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   recommendations: {
 *     priorityActions: [],
 *     investmentRecommendations: [],
 *     debtManagement: [],
 *     savingsSuggestions: [],
 *     warnings: [],
 *     governmentSchemes: [],
 *     personalizedInsights: [],
 *     metadata: {}
 *   }
 * }
 */
router.post('/', (req, res) => {
  try {
    // Validate required fields
    const requiredFields = [
      'financialScore',
      'monthlyIncome',
      'monthlyExpenses',
      'savings',
      'monthlyEMI',
      'age',
      'riskTolerance',
    ];

    const missingFields = requiredFields.filter((field) => !(field in req.body));

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate data types
    const numericFields = [
      'financialScore',
      'monthlyIncome',
      'monthlyExpenses',
      'savings',
      'existingInvestments',
      'loanAmount',
      'creditCardDebt',
      'monthlyEMI',
      'age',
    ];

    for (const field of numericFields) {
      if (req.body[field] !== undefined && typeof req.body[field] !== 'number') {
        return res.status(400).json({
          success: false,
          error: `${field} must be a number`,
        });
      }
    }

    // Validate ranges
    if (req.body.financialScore < 0 || req.body.financialScore > 100) {
      return res.status(400).json({
        success: false,
        error: 'financialScore must be between 0 and 100',
      });
    }

    if (req.body.age < 18 || req.body.age > 100) {
      return res.status(400).json({
        success: false,
        error: 'age must be between 18 and 100',
      });
    }

    // Generate recommendations
    const recommendations = recommendationEngine.generateRecommendations(req.body);

    // Return response
    res.json({
      success: true,
      recommendations: recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message,
    });
  }
});

/**
 * POST /api/recommendations/batch
 * Generate recommendations for multiple users
 * 
 * Request body:
 * {
 *   users: [
 *     { financialScore, monthlyIncome, ... },
 *     { financialScore, monthlyIncome, ... }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   recommendations: [
 *     { userId, recommendations },
 *     { userId, recommendations }
 *   ],
 *   processed: number,
 *   failed: number
 * }
 */
router.post('/batch', (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users)) {
      return res.status(400).json({
        success: false,
        error: 'users must be an array',
      });
    }

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'users array cannot be empty',
      });
    }

    if (users.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 users per batch request',
      });
    }

    const results = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i++) {
      try {
        const user = users[i];
        const recommendations = recommendationEngine.generateRecommendations(user);

        results.push({
          index: i,
          userId: user.userId || `user_${i}`,
          success: true,
          recommendations: recommendations,
        });

        processed++;
      } catch (error) {
        results.push({
          index: i,
          userId: users[i].userId || `user_${i}`,
          success: false,
          error: error.message,
        });

        failed++;
      }
    }

    res.json({
      success: true,
      results: results,
      summary: {
        total: users.length,
        processed: processed,
        failed: failed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing batch recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch recommendations',
      message: error.message,
    });
  }
});

/**
 * GET /api/recommendations/ratios
 * Calculate financial ratios for a user
 * 
 * Query parameters:
 * - monthlyIncome: number
 * - monthlyExpenses: number
 * - savings: number
 * - existingInvestments: number
 * - monthlyEMI: number
 * 
 * Response:
 * {
 *   success: boolean,
 *   ratios: {
 *     savingsRatio: number,
 *     debtRatio: number,
 *     expenseRatio: number,
 *     investmentRatio: number,
 *     disposableIncome: number
 *   }
 * }
 */
router.get('/ratios', (req, res) => {
  try {
    const { monthlyIncome, monthlyExpenses, savings, existingInvestments, monthlyEMI } =
      req.query;

    // Validate required fields
    if (!monthlyIncome || !monthlyExpenses || !savings || !monthlyEMI) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters',
      });
    }

    const financialData = {
      monthlyIncome: parseFloat(monthlyIncome),
      monthlyExpenses: parseFloat(monthlyExpenses),
      savings: parseFloat(savings),
      existingInvestments: parseFloat(existingInvestments) || 0,
      monthlyEMI: parseFloat(monthlyEMI),
    };

    const ratios = recommendationEngine.calculateRatios(financialData);

    res.json({
      success: true,
      ratios: ratios,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating ratios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ratios',
      message: error.message,
    });
  }
});

/**
 * GET /api/recommendations/urgency/:score
 * Get urgency level for a financial score
 * 
 * Path parameters:
 * - score: number (0-100)
 * 
 * Response:
 * {
 *   success: boolean,
 *   score: number,
 *   urgency: string,
 *   description: string
 * }
 */
router.get('/urgency/:score', (req, res) => {
  try {
    const score = parseFloat(req.params.score);

    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        error: 'Score must be a number between 0 and 100',
      });
    }

    const urgency = recommendationEngine.getUrgencyLevel(score);

    const descriptions = {
      critical: 'Immediate action required. Financial situation needs urgent attention.',
      high: 'Important action needed. Address financial issues soon.',
      medium: 'Moderate attention needed. Plan improvements.',
      low: 'Maintain current trajectory. Focus on optimization.',
    };

    res.json({
      success: true,
      score: score,
      urgency: urgency,
      description: descriptions[urgency],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting urgency level:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get urgency level',
      message: error.message,
    });
  }
});

/**
 * POST /api/recommendations/prioritize
 * Prioritize recommendations by urgency
 * 
 * Request body:
 * {
 *   recommendations: {
 *     priorityActions: [],
 *     warnings: [],
 *     debtManagement: [],
 *     savingsSuggestions: []
 *   }
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   prioritized: {
 *     critical: [],
 *     high: [],
 *     medium: [],
 *     low: []
 *   }
 * }
 */
router.post('/prioritize', (req, res) => {
  try {
    const { recommendations } = req.body;

    if (!recommendations) {
      return res.status(400).json({
        success: false,
        error: 'recommendations object is required',
      });
    }

    const prioritized = recommendationEngine.prioritizeRecommendations(recommendations);

    res.json({
      success: true,
      prioritized: prioritized,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error prioritizing recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prioritize recommendations',
      message: error.message,
    });
  }
});

/**
 * GET /api/recommendations/health
 * Health check for recommendation engine
 * 
 * Response:
 * {
 *   success: boolean,
 *   status: string,
 *   engine: string,
 *   version: string
 * }
 */
router.get('/health', (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      engine: 'Financial Recommendation Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

module.exports = router;
