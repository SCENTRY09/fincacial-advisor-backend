"""
FastAPI ML Serving Layer
========================

Production-level FastAPI server that loads trained ML models and exposes prediction APIs.

This server acts as the ML Intelligence Layer between:
- Node.js backend (client)
- ML models (.pkl files)

Architecture:
Frontend → Node.js Backend → FastAPI ML Server → ML Models → Predictions
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
from pathlib import Path

# Import schemas and predictor
from schemas import FinancialInput, PredictionResponse, HealthResponse
from predictor import MLPredictor

# =====================================================
# LOGGING SETUP
# =====================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# =====================================================
# FASTAPI APP INITIALIZATION
# =====================================================

app = FastAPI(
    title="Financial Advisor ML Server",
    description="Production ML serving layer for financial predictions",
    version="1.0.0"
)

# =====================================================
# CORS MIDDLEWARE
# =====================================================

# Allow requests from Node.js backend and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React frontend
        "http://localhost:3001",      # React frontend alt
        "http://localhost:5000",      # Node.js backend
        "http://localhost:8080",      # Node.js backend alt
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8080",
        "*"                           # Allow all in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# GLOBAL ML PREDICTOR (LOADED ONCE AT STARTUP)
# =====================================================

ml_predictor = None

@app.on_event("startup")
async def startup_event():
    """
    Load ML models once during server startup.
    This ensures models are loaded into memory only once.
    """
    global ml_predictor
    
    try:
        logger.info("🚀 Starting FastAPI ML Server...")
        
        # Initialize ML predictor (loads all models)
        ml_predictor = MLPredictor()
        
        logger.info("✅ ML models loaded successfully")
        logger.info(f"   - Risk Prediction Model: {ml_predictor.risk_model is not None}")
        logger.info(f"   - Spending Behavior Model: {ml_predictor.spending_model is not None}")
        logger.info(f"   - Financial Score Model: {ml_predictor.score_model is not None}")
        
    except Exception as e:
        logger.error(f"❌ Failed to load ML models: {str(e)}")
        sys.exit(1)

@app.on_event("shutdown")
async def shutdown_event():
    """
    Cleanup on server shutdown.
    """
    logger.info("🛑 Shutting down FastAPI ML Server...")

# =====================================================
# HEALTH CHECK ENDPOINT
# =====================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify server and model status.
    
    Returns:
        HealthResponse: Server status and model availability
    """
    try:
        if ml_predictor is None:
            return HealthResponse(
                status="unhealthy",
                message="ML models not loaded",
                models_loaded=False
            )
        
        return HealthResponse(
            status="healthy",
            message="ML server is running and models are loaded",
            models_loaded=True
        )
    
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            message=f"Error: {str(e)}",
            models_loaded=False
        )

# =====================================================
# PREDICTION ENDPOINT
# =====================================================

@app.post("/predict", response_model=PredictionResponse)
async def predict(financial_input: FinancialInput):
    """
    Main prediction endpoint.
    
    Accepts financial data and returns predictions from all three models:
    - Risk Prediction (Low Risk, Medium Risk, High Risk)
    - Spending Behavior (Saver, Balanced, Aggressive Spender, Debt Heavy)
    - Financial Score (0-100)
    
    Args:
        financial_input (FinancialInput): Financial data for prediction
    
    Returns:
        PredictionResponse: Predictions with confidence scores and metadata
    
    Raises:
        HTTPException: If models are not loaded or prediction fails
    """
    
    try:
        # Validate models are loaded
        if ml_predictor is None:
            logger.error("ML models not loaded")
            raise HTTPException(
                status_code=503,
                detail="ML models not loaded. Server may still be initializing."
            )
        
        logger.info(f"📊 Prediction request received for user with income: {financial_input.Income}")
        
        # Get predictions from all models
        predictions = ml_predictor.predict_all(financial_input)
        
        logger.info(f"✅ Predictions generated successfully")
        
        return predictions
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"❌ Prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

# =====================================================
# MODEL METADATA ENDPOINT
# =====================================================

@app.get("/models/metadata")
async def get_model_metadata():
    """
    Get metadata about loaded models.
    
    Returns:
        dict: Information about each model (features, classes, etc.)
    """
    
    try:
        if ml_predictor is None:
            raise HTTPException(
                status_code=503,
                detail="ML models not loaded"
            )
        
        metadata = {
            "risk_model": {
                "name": "Risk Prediction Model",
                "type": "RandomForestClassifier",
                "features": ml_predictor.risk_features,
                "classes": ml_predictor.risk_classes.tolist() if ml_predictor.risk_classes is not None else [],
                "status": "loaded"
            },
            "spending_model": {
                "name": "Spending Behavior Model",
                "type": "RandomForestClassifier",
                "features": ml_predictor.spending_features,
                "classes": ml_predictor.spending_classes.tolist() if ml_predictor.spending_classes is not None else [],
                "status": "loaded"
            },
            "score_model": {
                "name": "Financial Score Model",
                "type": "RandomForestRegressor",
                "features": ml_predictor.score_features,
                "status": "loaded"
            }
        }
        
        return metadata
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error fetching model metadata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch metadata: {str(e)}"
        )

# =====================================================
# ROOT ENDPOINT
# =====================================================

@app.get("/")
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "service": "Financial Advisor ML Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "predict": "/predict (POST)",
            "models_metadata": "/models/metadata",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }

# =====================================================
# ERROR HANDLERS
# =====================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Custom HTTP exception handler.
    """
    logger.error(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    General exception handler for unexpected errors.
    """
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

# =====================================================
# RUN SERVER
# =====================================================

if __name__ == "__main__":
    import uvicorn
    
    # Run with: uvicorn api.main:app --reload
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
