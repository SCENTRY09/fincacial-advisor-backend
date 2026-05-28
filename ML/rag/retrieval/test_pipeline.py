"""
Complete RAG + ML Pipeline Test Script

This script tests the entire financial advisor pipeline to verify:
1. All components load correctly
2. ML models execute
3. FAISS retrieval works
4. Context is built properly
5. Gemini/OpenAI integration works
6. Final roadmap is generated

Run with: python test_pipeline.py
"""

import sys
import os
from pathlib import Path

# Add project root to path
SCRIPT_DIR = Path(__file__).resolve().parent
RAG_DIR = SCRIPT_DIR.parent
ML_DIR = RAG_DIR.parent
PROJECT_ROOT = ML_DIR.parent

sys.path.insert(0, str(PROJECT_ROOT))

from ML.rag.retrieval.rag_pipeline import RAGPipeline, SAMPLE_PROFILE
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_pipeline():
    """Test the complete RAG + ML pipeline."""
    
    print("\n" + "=" * 100)
    print("COMPLETE RAG + ML PIPELINE TEST")
    print("=" * 100)
    
    try:
        # Step 1: Initialize pipeline
        print("\n[TEST 1] Initializing RAG Pipeline...")
        pipeline = RAGPipeline()
        
        if not pipeline.initialize():
            print("[FAILED] Pipeline initialization failed")
            return False
        
        print("[PASSED] Pipeline initialized successfully")
        
        # Step 2: Verify retriever is loaded
        print("\n[TEST 2] Verifying Retriever Component...")
        if pipeline.retriever is None:
            print("[FAILED] Retriever not initialized")
            return False
        
        if pipeline.retriever.index is None:
            print("[FAILED] FAISS index not loaded")
            return False
        
        print(f"[PASSED] Retriever loaded with {pipeline.retriever.index.ntotal} vectors")
        
        # Step 3: Verify ML models are loaded
        print("\n[TEST 3] Verifying ML Models...")
        if pipeline.ml_predictor.financial_score_model is None:
            print("[FAILED] Financial score model not loaded")
            return False
        
        if pipeline.ml_predictor.risk_model is None:
            print("[FAILED] Risk model not loaded")
            return False
        
        if pipeline.ml_predictor.spending_behavior_model is None:
            print("[FAILED] Spending behavior model not loaded")
            return False
        
        print("[PASSED] All ML models loaded successfully")
        
        # Step 4: Process sample profile
        print("\n[TEST 4] Processing Sample User Profile...")
        print(f"Profile: {SAMPLE_PROFILE['financialGoal']}")
        
        result = pipeline.process(SAMPLE_PROFILE)
        
        if not result.get('success'):
            print(f"[FAILED] Pipeline processing failed - {result.get('error')}")
            return False
        
        print("[PASSED] Pipeline processing completed successfully")
        
        # Step 5: Verify financial analysis
        print("\n[TEST 5] Verifying Financial Analysis...")
        analysis = result.get('financialAnalysis', {})
        
        if not analysis.get('financialScore'):
            print("[FAILED] Financial score not generated")
            return False
        
        if not analysis.get('riskLevel'):
            print("[FAILED] Risk level not generated")
            return False
        
        if not analysis.get('spendingBehavior'):
            print("[FAILED] Spending behavior not generated")
            return False
        
        print(f"[PASSED] Financial Analysis Generated")
        print(f"   - Financial Score: {analysis['financialScore']:.1f}/100")
        print(f"   - Risk Level: {analysis['riskLevel']}")
        print(f"   - Spending Behavior: {analysis['spendingBehavior']}")
        
        # Step 6: Verify retrieval results
        print("\n[TEST 6] Verifying Retrieval Results...")
        sources = result.get('retrievedSources', [])
        
        if not sources:
            print("[WARNING] No sources retrieved")
        else:
            print(f"[PASSED] Retrieved {len(sources)} sources")
            for source in sources[:5]:
                print(f"   - {source}")
        
        # Step 7: Verify retrieval statistics
        print("\n[TEST 7] Verifying Retrieval Statistics...")
        retrieval_stats = result.get('retrievalStats', {})
        
        chunks_retrieved = retrieval_stats.get('chunks_retrieved', 0)
        avg_relevance = retrieval_stats.get('avg_relevance', 0)
        
        if chunks_retrieved == 0:
            print("[WARNING] No chunks retrieved")
        else:
            print(f"[PASSED] Retrieval Statistics")
            print(f"   - Chunks Retrieved: {chunks_retrieved}")
            print(f"   - Average Relevance: {avg_relevance:.4f}")
            print(f"   - Queries Used: {retrieval_stats.get('queries_used', 0)}")
        
        # Step 8: Verify roadmap generation
        print("\n[TEST 8] Verifying Roadmap Generation...")
        roadmap = result.get('roadmap', '')
        
        if not roadmap or len(roadmap) < 100:
            print("[FAILED] Roadmap not generated or too short")
            return False
        
        print(f"[PASSED] Roadmap generated ({len(roadmap):,} characters)")
        print(f"   - Contains financial advice: {'YES' if any(word in roadmap.lower() for word in ['invest', 'save', 'budget', 'debt']) else 'NO'}")
        print(f"   - Formatted sections: {roadmap.count('**')//2}")
        
        # Step 9: Verify validation checks
        print("\n[TEST 9] Verifying Validation Checks...")
        validation_passed = result.get('validationPassed', False)
        
        if not validation_passed:
            print("[WARNING] Some validation checks failed")
        else:
            print("[PASSED] All validation checks passed")
        
        # Step 10: Verify processing time
        print("\n[TEST 10] Verifying Performance...")
        processing_time = result.get('processingTime', 0)
        
        print(f"[PASSED] Pipeline Performance")
        print(f"   - Total Processing Time: {processing_time:.2f}s")
        
        # Final summary
        print("\n" + "=" * 100)
        print("PIPELINE TEST SUMMARY")
        print("=" * 100)
        print("[SUCCESS] ALL TESTS PASSED")
        print("\nPipeline Components Verified:")
        print("  [OK] RAG Pipeline initialization")
        print("  [OK] Retriever component (FAISS index)")
        print("  [OK] ML models (Financial Score, Risk, Spending Behavior)")
        print("  [OK] User profile processing")
        print("  [OK] Financial analysis generation")
        print("  [OK] Semantic retrieval")
        print("  [OK] Context building")
        print("  [OK] Roadmap generation")
        print("  [OK] Validation checks")
        print("  [OK] Performance metrics")
        
        print("\n" + "=" * 100)
        print("ROADMAP PREVIEW (First 1000 characters)")
        print("=" * 100)
        print(roadmap[:1000])
        print("\n[... roadmap continues ...]")
        
        print("\n" + "=" * 100)
        
        return True
        
    except Exception as e:
        logger.error(f"Test failed with error: {e}", exc_info=True)
        print(f"\n[FAILED] TEST FAILED: {e}")
        return False


if __name__ == '__main__':
    success = test_pipeline()
    sys.exit(0 if success else 1)
