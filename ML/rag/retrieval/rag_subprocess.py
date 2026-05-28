#!/usr/bin/env python3
"""
RAG Pipeline Subprocess Wrapper

This script is called by Node.js as a subprocess.
It reads user profile from stdin and outputs JSON to stdout.
ALL debug/log output goes to stderr — stdout is reserved for the single JSON line.

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

# ─────────────────────────────────────────────────────────────────────────────
# CRITICAL: Redirect ALL stdout prints to stderr BEFORE importing anything.
# This ensures only the final json.dumps() line reaches Node.js on stdout.
# ─────────────────────────────────────────────────────────────────────────────
_real_stdout = sys.stdout
sys.stdout = sys.stderr   # all print() calls now go to stderr

# Add project root to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Configure logging → stderr only
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Suppress noisy third-party loggers
logging.getLogger('sentence_transformers').setLevel(logging.WARNING)
logging.getLogger('sklearn').setLevel(logging.WARNING)
logging.getLogger('faiss').setLevel(logging.WARNING)
logging.getLogger('google').setLevel(logging.WARNING)
logging.getLogger('huggingface_hub').setLevel(logging.WARNING)

try:
    from ML.rag.retrieval.rag_pipeline import RAGPipeline
except ImportError as e:
    # Restore stdout to emit the error JSON
    sys.stdout = _real_stdout
    error_output = {
        'success': False,
        'error': f'Failed to import RAGPipeline: {str(e)}',
        'roadmap': '',
        'financial_advice': '',
        'retrievedSources': [],
        'retrievalStats': {},
        'financialAnalysis': {}
    }
    print(json.dumps(error_output))
    sys.exit(1)


def emit_json(data: dict):
    """Write JSON exclusively to the real stdout so Node.js can parse it."""
    sys.stdout = _real_stdout
    # Use ensure_ascii=True so all non-ASCII chars are escaped — safe on any platform
    sys.stdout.buffer.write((json.dumps(data, ensure_ascii=True) + '\n').encode('utf-8'))
    sys.stdout.buffer.flush()
    sys.stdout = sys.stderr  # restore redirect


def main():
    """Main entry point for subprocess."""
    try:
        # Read user profile from stdin (stdin is unaffected by the stdout redirect)
        input_data = sys.stdin.read()

        if not input_data.strip():
            logger.error("No input data received")
            emit_json({
                'success': False,
                'error': 'No input data received',
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            })
            sys.exit(1)

        try:
            profile = json.loads(input_data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            emit_json({
                'success': False,
                'error': f'Invalid JSON: {str(e)}',
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            })
            sys.exit(1)

        # Initialize and run RAG pipeline
        pipeline = RAGPipeline()

        if not pipeline.initialize():
            logger.error("Failed to initialize pipeline")
            emit_json({
                'success': False,
                'error': 'Failed to initialize RAG pipeline',
                'roadmap': '',
                'financial_advice': '',
                'retrievedSources': [],
                'retrievalStats': {},
                'financialAnalysis': {}
            })
            sys.exit(1)

        # Get Gemini API key from environment
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        logger.info(f"GEMINI_API_KEY present: {bool(gemini_api_key)}")

        # Run the full RAG pipeline
        result = pipeline.process(profile, gemini_api_key=gemini_api_key)

        # Build output
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

        emit_json(output)

    except Exception as e:
        logger.error(f"Fatal error in subprocess: {e}", exc_info=True)
        emit_json({
            'success': False,
            'error': str(e),
            'roadmap': '',
            'financial_advice': '',
            'retrievedSources': [],
            'retrievalStats': {},
            'financialAnalysis': {}
        })
        sys.exit(1)


if __name__ == '__main__':
    main()
