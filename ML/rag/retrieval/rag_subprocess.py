#!/usr/bin/env python3
"""
RAG Pipeline Subprocess Wrapper

This script is called by Node.js as a subprocess.
It reads user profile from stdin and outputs JSON to stdout.

Usage:
    python rag_subprocess.py < user_profile.json
"""

import json
import sys
import logging
import os
import warnings
from pathlib import Path
from datetime import datetime
from io import StringIO

# Suppress all warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Suppress all print statements from imported modules
class SuppressPrints:
    def write(self, x):
        pass
    def flush(self):
        pass

# Add project root to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Configure logging to suppress everything
logging.basicConfig(
    level=logging.CRITICAL,  # Only show critical errors
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Suppress logging from all modules
logging.getLogger('sentence_transformers').setLevel(logging.CRITICAL)
logging.getLogger('sklearn').setLevel(logging.CRITICAL)
logging.getLogger('faiss').setLevel(logging.CRITICAL)
logging.getLogger('google').setLevel(logging.CRITICAL)

# Suppress print output from RAG pipeline
_original_stdout = sys.stdout

try:
    from ML.rag.retrieval.rag_pipeline import RAGPipeline
except ImportError as e:
    sys.stdout = _original_stdout
    output = {
        'success': False,
        'error': f'Failed to import RAGPipeline: {str(e)}',
        'roadmap': '',
        'financial_advice': '',
        'retrievedSources': [],
        'retrievalStats': {},
        'financialAnalysis': {}
    }
    print(json.dumps(output))
    sys.exit(1)


def main():
    """Main entry point for subprocess."""
    try:
        # Read user profile from stdin
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            logger.error("No input data received")
            output = {
                'success': False,
                'error': 'No input data received',
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            }
            print(json.dumps(output))
            sys.exit(1)
        
        try:
            profile = json.loads(input_data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            output = {
                'success': False,
                'error': f'Invalid JSON: {str(e)}',
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            }
            print(json.dumps(output))
            sys.exit(1)
        
        # Initialize and run RAG pipeline
        pipeline = RAGPipeline()
        
        if not pipeline.initialize():
            logger.error("Failed to initialize pipeline")
            output = {
                'success': False,
                'error': 'Failed to initialize RAG pipeline',
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            }
            print(json.dumps(output))
            sys.exit(1)
        
        # Get Gemini API key from environment
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        
        # Process through RAG pipeline (allow debug output for troubleshooting)
        result = pipeline.process(profile, gemini_api_key=gemini_api_key)
        
        # Ensure result has all required fields
        if result.get('success'):
            output = {
                'success': True,
                'roadmap': result.get('roadmap', ''),
                'financial_advice': result.get('roadmap', ''),
                'retrievedSources': result.get('retrievedSources', []),
                'retrievalStats': result.get('retrievalStats', {}),
                'financialAnalysis': result.get('financialAnalysis', {}),
                'processingTime': result.get('processingTime', 0),
                'validationPassed': result.get('validationPassed', False)
            }
        else:
            output = {
                'success': False,
                'error': result.get('error', 'Unknown error'),
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            }
        
        # Output JSON to stdout (Node.js will parse this)
        print(json.dumps(output))
        
    except Exception as e:
        logger.error(f"Fatal error in subprocess: {e}", exc_info=True)
        output = {
            'success': False,
            'error': str(e),
            'roadmap': '',
            'financial_advice': '',
            'retrievedSources': [],
            'retrievalStats': {},
            'financialAnalysis': {}
        }
        print(json.dumps(output))
        sys.exit(1)


if __name__ == '__main__':
    main()
