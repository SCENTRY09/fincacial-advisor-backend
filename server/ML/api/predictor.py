"""
ML Predictor Module
===================

Loads trained ML models and provides unified prediction interface.

This module handles:
1. Loading all trained models from disk
2. Preprocessing input data
3. Making predictions from all models
4. Formatting predictions for API response
"""

import pickle
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any

from schemas import FinancialInput, PredictionResponse

# =====================================================
# LOGGING
# =====================================================

logger = logging.getLogger(__name__)

# =====================================================
# MODEL PATHS
# =====================================================

# Get the directory where this file is located
CURRENT_DIR = Path(__file__).parent.parent
MODELS_DIR = CURRENT_DIR / "models"

MODEL_PATHS = {
    "risk_model": MODELS_DIR / "risk_prediction_model.pkl",
    "risk_encoder": MODELS_DIR / "risk_label_encoder.pkl",
    "risk_features": MODELS_DIR / "risk_model_features.pkl",
    
    "spending_model": MODELS_DIR / "spending_behavior_model.pkl",
    "spending_encoder": MODELS_DIR / "spending_behavior_label_encoder.pkl",
    "spending_features": MODELS_DIR / "spending_behavior_features.pkl",
    
    "score_model": MODELS_DIR / "financial_score_model.pkl",
    "score_features": MODELS_DIR / "financial_score_features.pkl",
}

# =====================================================
# ML PREDICTOR CLASS
# =====================================================

class MLPredictor:
    """
    Unified ML prediction interface.
    
    Loads all trained models and provides methods to:
    - Make predictions from individual models
    - Make predictions from all models simultaneously
    - Handle input validation and preprocessing
    """
    
    def __init__(self):
        """
        Initialize predictor by loading all models from disk.
        """
        logger.info("Initializing MLPredictor...")
        
        # Risk model components
        self.risk_model = None
        self.risk_encoder = None
        self.risk_features = None
        self.risk_classes = None
        
        # Spending behavior model components
        self.spending_model = None
        self.spending_encoder = None
        self.spending_features = None
        self.spending_classes = None
        
        # Financial score model components
        self.score_model = None
        self.score_features = None
        
        # Load all models
        self._load_models()
    
    def _load_models(self):
        """
        Load all trained models from disk.
        
        Raises:
            FileNotFoundError: If any model file is missing
            Exception: If model loading fails
        """
        
        try:
            # ─── Load Risk Prediction Model ───────────────────────────────────
            logger.info("Loading Risk Prediction Model...")
            
            with open(MODEL_PATHS["risk_model"], "rb") as f:
                self.risk_model = pickle.load(f)
            
            with open(MODEL_PATHS["risk_encoder"], "rb") as f:
                self.risk_encoder = pickle.load(f)
            
            with open(MODEL_PATHS["risk_features"], "rb") as f:
                self.risk_features = pickle.load(f)
            
            self.risk_classes = self.risk_encoder.classes_
            logger.info(f"✓ Risk model loaded. Classes: {self.risk_classes}")
            
            # ─── Load Spending Behavior Model ────────────────────────────────
            logger.info("Loading Spending Behavior Model...")
            
            with open(MODEL_PATHS["spending_model"], "rb") as f:
                self.spending_model = pickle.load(f)
            
            with open(MODEL_PATHS["spending_encoder"], "rb") as f:
                self.spending_encoder = pickle.load(f)
            
            with open(MODEL_PATHS["spending_features"], "rb") as f:
                self.spending_features = pickle.load(f)
            
            self.spending_classes = self.spending_encoder.classes_
            logger.info(f"✓ Spending model loaded. Classes: {self.spending_classes}")
            
            # ─── Load Financial Score Model ──────────────────────────────────
            logger.info("Loading Financial Score Model...")
            
            with open(MODEL_PATHS["score_model"], "rb") as f:
                self.score_model = pickle.load(f)
            
            with open(MODEL_PATHS["score_features"], "rb") as f:
                self.score_features = pickle.load(f)
            
            logger.info(f"✓ Score model loaded")
            
            logger.info("✅ All models loaded successfully")
        
        except FileNotFoundError as e:
            logger.error(f"❌ Model file not found: {str(e)}")
            raise
        
        except Exception as e:
            logger.error(f"❌ Error loading models: {str(e)}")
            raise
    
    def _prepare_features(self, financial_input: FinancialInput, features: list) -> np.ndarray:
        """
        Convert FinancialInput to feature array for model prediction.
        
        Args:
            financial_input: Input financial data
            features: List of feature names expected by model
        
        Returns:
            np.ndarray: Feature array for prediction
        """
        
        # Convert input to dictionary
        input_dict = financial_input.dict()
        
        # Create feature array in correct order
        feature_array = np.array([
            [input_dict[feature] for feature in features]
        ])
        
        return feature_array
    
    def predict_risk(self, financial_input: FinancialInput) -> Dict[str, Any]:
        """
        Predict financial risk category.
        
        Args:
            financial_input: Input financial data
        
        Returns:
            dict: Risk prediction with confidence scores
        """
        
        try:
            # Prepare features
            X = self._prepare_features(financial_input, self.risk_features)
            
            # Make prediction
            risk_pred = self.risk_model.predict(X)[0]
            risk_proba = self.risk_model.predict_proba(X)[0]
            
            # Decode prediction
            risk_label = self.risk_encoder.inverse_transform([risk_pred])[0]
            risk_confidence = float(np.max(risk_proba))
            
            # Create probability distribution
            risk_probabilities = {
                class_name: float(prob)
                for class_name, prob in zip(self.risk_classes, risk_proba)
            }
            
            logger.info(f"Risk prediction: {risk_label} (confidence: {risk_confidence:.4f})")
            
            return {
                "prediction": risk_label,
                "confidence": risk_confidence,
                "probabilities": risk_probabilities
            }
        
        except Exception as e:
            logger.error(f"Error in risk prediction: {str(e)}")
            raise
    
    def predict_spending_behavior(self, financial_input: FinancialInput) -> Dict[str, Any]:
        """
        Predict spending behavior category.
        
        Args:
            financial_input: Input financial data
        
        Returns:
            dict: Spending behavior prediction with confidence scores
        """
        
        try:
            # Prepare features
            X = self._prepare_features(financial_input, self.spending_features)
            
            # Make prediction
            spending_pred = self.spending_model.predict(X)[0]
            spending_proba = self.spending_model.predict_proba(X)[0]
            
            # Decode prediction
            spending_label = self.spending_encoder.inverse_transform([spending_pred])[0]
            spending_confidence = float(np.max(spending_proba))
            
            # Create probability distribution
            spending_probabilities = {
                class_name: float(prob)
                for class_name, prob in zip(self.spending_classes, spending_proba)
            }
            
            logger.info(f"Spending behavior prediction: {spending_label} (confidence: {spending_confidence:.4f})")
            
            return {
                "prediction": spending_label,
                "confidence": spending_confidence,
                "probabilities": spending_probabilities
            }
        
        except Exception as e:
            logger.error(f"Error in spending behavior prediction: {str(e)}")
            raise
    
    def predict_financial_score(self, financial_input: FinancialInput) -> Dict[str, Any]:
        """
        Predict financial score (0-100).
        
        Args:
            financial_input: Input financial data
        
        Returns:
            dict: Financial score prediction
        """
        
        try:
            # Prepare features
            X = self._prepare_features(financial_input, self.score_features)
            
            # Make prediction
            score = float(self.score_model.predict(X)[0])
            
            # Clamp score to 0-100 range
            score = max(0, min(100, score))
            
            logger.info(f"Financial score prediction: {score:.2f}")
            
            return {
                "prediction": score,
                "confidence": 0.95  # Regression models don't have confidence in same way
            }
        
        except Exception as e:
            logger.error(f"Error in financial score prediction: {str(e)}")
            raise
    
    def predict_all(self, financial_input: FinancialInput) -> PredictionResponse:
        """
        Make predictions from all models simultaneously.
        
        Args:
            financial_input: Input financial data
        
        Returns:
            PredictionResponse: Combined predictions from all models
        """
        
        try:
            logger.info("Making predictions from all models...")
            
            # Get predictions from each model
            risk_result = self.predict_risk(financial_input)
            spending_result = self.predict_spending_behavior(financial_input)
            score_result = self.predict_financial_score(financial_input)
            
            # Create response
            response = PredictionResponse(
                risk_prediction=risk_result["prediction"],
                risk_confidence=risk_result["confidence"],
                spending_behavior=spending_result["prediction"],
                spending_confidence=spending_result["confidence"],
                financial_score=score_result["prediction"],
                financial_score_confidence=score_result["confidence"],
                risk_probabilities=risk_result["probabilities"],
                spending_probabilities=spending_result["probabilities"],
                metadata={
                    "model_version": "1.0.0",
                    "models_used": [
                        "risk_prediction_model",
                        "spending_behavior_model",
                        "financial_score_model"
                    ]
                }
            )
            
            logger.info("✅ All predictions completed successfully")
            
            return response
        
        except Exception as e:
            logger.error(f"Error in predict_all: {str(e)}")
            raise
