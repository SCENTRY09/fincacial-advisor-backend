"""
RAG Retrieval Module

This module provides document retrieval functionality for the RAG system.

Exports:
    DocumentRetriever: Main retriever class
    RetrievalResult: Data class for retrieval results
"""

from .retriever import DocumentRetriever, RetrievalResult

__all__ = ['DocumentRetriever', 'RetrievalResult']
__version__ = '1.0.0'
