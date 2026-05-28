/**
 * ML Prediction Client
 * ====================
 * 
 * Node.js client for communicating with the FastAPI ML server.
 * 
 * This module provides:
 * - Connection management to ML server
 * - Request/response handling
 * - Error handling and retries
 * - Caching of predictions (optional)
 * 
 * Usage:
 *   const predictions = await mlClient.predict(financialData);
 */

const axios = require('axios');

// =====================================================
// LOGGING HELPER
// =====================================================

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';
const ML_REQUEST_TIMEOUT = parseInt(process.env.ML_REQUEST_TIMEOUT || '30000');
const ML_RETRY_ATTEMPTS = parseInt(process.env.ML_RETRY_ATTEMPTS || '3');
const ML_RETRY_DELAY = parseInt(process.env.ML_RETRY_DELAY || '1000');

// =====================================================
// AXIOS INSTANCE
// =====================================================

const mlAxios = axios.create({
  baseURL: ML_SERVER_URL,
  timeout: ML_REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * Check if ML server is healthy and models are loaded.
 * 
 * @returns {Promise<boolean>} True if server is healthy
 */
async function checkHealth() {
  try {
    const response = await mlAxios.get('/health');
    const isHealthy = response.data.status === 'healthy' && response.data.models_loaded;
    
    if (isHealthy) {
      logger.info('✅ ML Server is healthy');
    } else {
      logger.warn('⚠️ ML Server is not healthy:', response.data.message);
    }
    
    return isHealthy;
  } catch (error) {
    logger.error('❌ ML Server health check failed:', error.message);
    return false;
  }
}

// =====================================================
// PREDICTION REQUEST
// =====================================================

/**
 * Make a prediction request to the ML server.
 * 
 * @param {Object} financialData - Financial input data
 * @param {number} financialData.Income - Annual income
 * @param {number} financialData.Age - User age
 * @param {number} financialData.Dependents - Number of dependents
 * @param {number} financialData.Desired_Savings - Desired monthly savings
 * @param {number} financialData.Disposable_Income - Monthly disposable income
 * @param {number} financialData.Loan_Repayment - Monthly loan repayment
 * @param {number} financialData.Savings_Ratio - Savings ratio (0-100)
 * @param {number} financialData.Debt_Ratio - Debt ratio (0-100)
 * @param {number} financialData.Expense_Ratio - Expense ratio (0-100)
 * 
 * @returns {Promise<Object>} Prediction response with risk, spending behavior, and financial score
 * 
 * @throws {Error} If prediction fails after retries
 */
async function predict(financialData) {
  logger.info('📊 Sending prediction request to ML server...');
  
  // Validate input
  if (!financialData || typeof financialData !== 'object') {
    throw new Error('Invalid financial data provided');
  }
  
  // Validate required fields
  const requiredFields = [
    'Income',
    'Age',
    'Dependents',
    'Desired_Savings',
    'Disposable_Income',
    'Loan_Repayment',
    'Savings_Ratio',
    'Debt_Ratio',
    'Expense_Ratio',
  ];
  
  const missingFields = requiredFields.filter(field => !(field in financialData));
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Retry logic
  let lastError;
  for (let attempt = 1; attempt <= ML_RETRY_ATTEMPTS; attempt++) {
    try {
      logger.info(`🔄 Prediction attempt ${attempt}/${ML_RETRY_ATTEMPTS}`);
      
      const response = await mlAxios.post('/predict', financialData);
      
      logger.info('✅ Prediction received successfully');
      logger.debug('Prediction response:', response.data);
      
      return response.data;
    } catch (error) {
      lastError = error;
      
      logger.warn(`⚠️ Prediction attempt ${attempt} failed:`, error.message);
      
      if (attempt < ML_RETRY_ATTEMPTS) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, ML_RETRY_DELAY));
      }
    }
  }
  
  // All retries failed
  logger.error('❌ Prediction failed after all retries');
  throw new Error(`ML prediction failed: ${lastError.message}`);
}

// =====================================================
// BATCH PREDICTION
// =====================================================

/**
 * Make batch predictions for multiple users.
 * 
 * @param {Array<Object>} financialDataArray - Array of financial input data
 * 
 * @returns {Promise<Object>} Batch prediction response
 * 
 * @throws {Error} If batch prediction fails
 */
async function predictBatch(financialDataArray) {
  logger.info(`📊 Sending batch prediction request for ${financialDataArray.length} users...`);
  
  if (!Array.isArray(financialDataArray) || financialDataArray.length === 0) {
    throw new Error('Invalid batch data provided');
  }
  
  try {
    const response = await mlAxios.post('/predict/batch', {
      predictions: financialDataArray,
    });
    
    logger.info(`✅ Batch predictions received: ${response.data.successful} successful, ${response.data.failed} failed`);
    
    return response.data;
  } catch (error) {
    logger.error('❌ Batch prediction failed:', error.message);
    throw new Error(`ML batch prediction failed: ${error.message}`);
  }
}

// =====================================================
// MODEL METADATA
// =====================================================

/**
 * Get metadata about loaded ML models.
 * 
 * @returns {Promise<Object>} Model metadata (features, classes, etc.)
 * 
 * @throws {Error} If metadata request fails
 */
async function getModelMetadata() {
  logger.info('📋 Fetching ML model metadata...');
  
  try {
    const response = await mlAxios.get('/models/metadata');
    
    logger.info('✅ Model metadata retrieved');
    logger.debug('Metadata:', response.data);
    
    return response.data;
  } catch (error) {
    logger.error('❌ Failed to fetch model metadata:', error.message);
    throw new Error(`Failed to fetch model metadata: ${error.message}`);
  }
}

// =====================================================
// PREDICTION WITH FALLBACK
// =====================================================

/**
 * Make a prediction with fallback to heuristic rules if ML server is unavailable.
 * 
 * This ensures the system continues to work even if the ML server is down.
 * 
 * @param {Object} financialData - Financial input data
 * 
 * @returns {Promise<Object>} Prediction response (from ML or heuristic)
 */
async function predictWithFallback(financialData) {
  try {
    // Try ML prediction first
    return await predict(financialData);
  } catch (error) {
    logger.warn('⚠️ ML prediction failed, using heuristic fallback:', error.message);
    
    // Fallback to heuristic rules
    return generateHeuristicPrediction(financialData);
  }
}

// =====================================================
// HEURISTIC FALLBACK
// =====================================================

/**
 * Generate predictions using heuristic rules (fallback when ML server is unavailable).
 * 
 * @param {Object} financialData - Financial input data
 * 
 * @returns {Object} Heuristic prediction response
 */
function generateHeuristicPrediction(financialData) {
  logger.info('🔧 Generating heuristic prediction...');
  
  const {
    Income,
    Savings_Ratio,
    Debt_Ratio,
    Expense_Ratio,
  } = financialData;
  
  // ─── Risk Prediction (Heuristic) ──────────────────────────────────────
  let riskPrediction = 'Medium Risk';
  let riskConfidence = 0.65;
  
  if (Debt_Ratio > 50 || Expense_Ratio > 85) {
    riskPrediction = 'High Risk';
    riskConfidence = 0.70;
  } else if (Debt_Ratio < 20 && Savings_Ratio > 25) {
    riskPrediction = 'Low Risk';
    riskConfidence = 0.70;
  }
  
  // ─── Spending Behavior (Heuristic) ───────────────────────────────────
  let spendingBehavior = 'Balanced';
  let spendingConfidence = 0.65;
  
  if (Savings_Ratio > 30 && Expense_Ratio < 50) {
    spendingBehavior = 'Saver';
    spendingConfidence = 0.70;
  } else if (Expense_Ratio > 80 && Savings_Ratio < 10) {
    spendingBehavior = 'Aggressive Spender';
    spendingConfidence = 0.70;
  } else if (Debt_Ratio > 40) {
    spendingBehavior = 'Debt Heavy';
    spendingConfidence = 0.70;
  }
  
  // ─── Financial Score (Heuristic) ─────────────────────────────────────
  let financialScore = 50;
  
  // Base score
  if (Savings_Ratio > 20) financialScore += 15;
  if (Debt_Ratio < 30) financialScore += 15;
  if (Expense_Ratio < 60) financialScore += 10;
  if (Income > 500000) financialScore += 10;
  
  // Clamp to 0-100
  financialScore = Math.max(0, Math.min(100, financialScore));
  
  return {
    risk_prediction: riskPrediction,
    risk_confidence: riskConfidence,
    spending_behavior: spendingBehavior,
    spending_confidence: spendingConfidence,
    financial_score: financialScore,
    financial_score_confidence: 0.60,
    risk_probabilities: {
      'Low Risk': riskPrediction === 'Low Risk' ? riskConfidence : (1 - riskConfidence) / 2,
      'Medium Risk': riskPrediction === 'Medium Risk' ? riskConfidence : (1 - riskConfidence) / 2,
      'High Risk': riskPrediction === 'High Risk' ? riskConfidence : (1 - riskConfidence) / 2,
    },
    spending_probabilities: {
      'Saver': spendingBehavior === 'Saver' ? spendingConfidence : (1 - spendingConfidence) / 3,
      'Balanced': spendingBehavior === 'Balanced' ? spendingConfidence : (1 - spendingConfidence) / 3,
      'Aggressive Spender': spendingBehavior === 'Aggressive Spender' ? spendingConfidence : (1 - spendingConfidence) / 3,
      'Debt Heavy': spendingBehavior === 'Debt Heavy' ? spendingConfidence : (1 - spendingConfidence) / 3,
    },
    metadata: {
      model_version: '1.0.0-heuristic',
      prediction_source: 'heuristic_fallback',
      models_used: ['heuristic_rules'],
    },
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  checkHealth,
  predict,
  predictBatch,
  getModelMetadata,
  predictWithFallback,
  generateHeuristicPrediction,
};
