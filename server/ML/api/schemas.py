"""
Pydantic Schemas for FastAPI
=============================

Request and response schemas for the ML serving layer.
These schemas provide type validation and API documentation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional

# =====================================================
# REQUEST SCHEMAS
# =====================================================

class FinancialInput(BaseModel):
    """
    Financial input data for ML predictions.
    
    All fields are required for accurate predictions.
    """
    
    Income: float = Field(
        ...,
        description="Annual income in rupees",
        gt=0
    )
    
    Age: int = Field(
        ...,
        description="Age of the user in years",
        ge=18,
        le=100
    )
    
    Dependents: int = Field(
        ...,
        description="Number of dependents",
        ge=0,
        le=10
    )
    
    Desired_Savings: float = Field(
        ...,
        description="Desired monthly savings in rupees",
        ge=0
    )
    
    Disposable_Income: float = Field(
        ...,
        description="Monthly disposable income in rupees",
        ge=0
    )
    
    Loan_Repayment: float = Field(
        ...,
        description="Monthly loan repayment amount in rupees",
        ge=0
    )
    
    Savings_Ratio: float = Field(
        ...,
        description="Savings ratio as percentage (0-100)",
        ge=0,
        le=100
    )
    
    Debt_Ratio: float = Field(
        ...,
        description="Debt ratio as percentage (0-100)",
        ge=0,
        le=100
    )
    
    Expense_Ratio: float = Field(
        ...,
        description="Expense ratio as percentage (0-100)",
        ge=0,
        le=100
    )
    
    class Config:
        schema_extra = {
            "example": {
                "Income": 600000,
                "Age": 35,
                "Dependents": 2,
                "Desired_Savings": 15000,
                "Disposable_Income": 50000,
                "Loan_Repayment": 20000,
                "Savings_Ratio": 25,
                "Debt_Ratio": 35,
                "Expense_Ratio": 65
            }
        }

# =====================================================
# RESPONSE SCHEMAS
# =====================================================

class PredictionResponse(BaseModel):
    """
    ML prediction response containing all model outputs.
    """
    
    risk_prediction: str = Field(
        ...,
        description="Risk classification (Low Risk, Medium Risk, High Risk)"
    )
    
    risk_confidence: float = Field(
        ...,
        description="Confidence score for risk prediction (0-1)",
        ge=0,
        le=1
    )
    
    spending_behavior: str = Field(
        ...,
        description="Spending behavior classification (Saver, Balanced, Aggressive Spender, Debt Heavy)"
    )
    
    spending_confidence: float = Field(
        ...,
        description="Confidence score for spending behavior prediction (0-1)",
        ge=0,
        le=1
    )
    
    financial_score: float = Field(
        ...,
        description="Predicted financial score (0-100)",
        ge=0,
        le=100
    )
    
    financial_score_confidence: float = Field(
        ...,
        description="Confidence score for financial score prediction (0-1)",
        ge=0,
        le=1
    )
    
    risk_probabilities: Optional[dict] = Field(
        None,
        description="Probability distribution for risk classes"
    )
    
    spending_probabilities: Optional[dict] = Field(
        None,
        description="Probability distribution for spending behavior classes"
    )
    
    metadata: Optional[dict] = Field(
        None,
        description="Additional metadata about predictions"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "risk_prediction": "Medium Risk",
                "risk_confidence": 0.78,
                "spending_behavior": "Balanced",
                "spending_confidence": 0.82,
                "financial_score": 65.5,
                "financial_score_confidence": 0.91,
                "risk_probabilities": {
                    "Low Risk": 0.15,
                    "Medium Risk": 0.78,
                    "High Risk": 0.07
                },
                "spending_probabilities": {
                    "Saver": 0.10,
                    "Balanced": 0.82,
                    "Aggressive Spender": 0.05,
                    "Debt Heavy": 0.03
                },
                "metadata": {
                    "model_version": "1.0.0",
                    "prediction_timestamp": "2024-01-15T10:30:00Z"
                }
            }
        }

class HealthResponse(BaseModel):
    """
    Health check response.
    """
    
    status: str = Field(
        ...,
        description="Server status (healthy/unhealthy)"
    )
    
    message: str = Field(
        ...,
        description="Status message"
    )
    
    models_loaded: bool = Field(
        ...,
        description="Whether ML models are loaded"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "message": "ML server is running and models are loaded",
                "models_loaded": True
            }
        }

# =====================================================
# BATCH PREDICTION SCHEMA (OPTIONAL)
# =====================================================

class BatchPredictionRequest(BaseModel):
    """
    Batch prediction request for multiple users.
    """
    
    predictions: List[FinancialInput] = Field(
        ...,
        description="List of financial inputs for batch prediction"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "predictions": [
                    {
                        "Income": 600000,
                        "Age": 35,
                        "Dependents": 2,
                        "Desired_Savings": 15000,
                        "Disposable_Income": 50000,
                        "Loan_Repayment": 20000,
                        "Savings_Ratio": 25,
                        "Debt_Ratio": 35,
                        "Expense_Ratio": 65
                    }
                ]
            }
        }

class BatchPredictionResponse(BaseModel):
    """
    Batch prediction response.
    """
    
    predictions: List[PredictionResponse] = Field(
        ...,
        description="List of predictions"
    )
    
    total_processed: int = Field(
        ...,
        description="Total number of predictions processed"
    )
    
    successful: int = Field(
        ...,
        description="Number of successful predictions"
    )
    
    failed: int = Field(
        ...,
        description="Number of failed predictions"
    )
