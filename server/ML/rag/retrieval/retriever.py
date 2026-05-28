"""
Document Retrieval Module for RAG System

This module provides efficient retrieval of relevant financial knowledge
documents using FAISS vector search and semantic similarity.

Features:
- Load FAISS index and metadata
- Semantic search using embeddings
- Retrieve top-k relevant documents
- Filter by category
- Rerank results by relevance
- Support for hybrid search
- Caching for performance

Author: Financial Advisor Team
Version: 1.0.0
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# Third-party imports
try:
    from sentence_transformers import SentenceTransformer
    import faiss
except ImportError:
    print("Error: Required packages not installed.")
    print("Install with: pip install sentence-transformers faiss-cpu")
    exit(1)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get absolute base directory
# New structure: server/ML/rag/retrieval/retriever.py
SCRIPT_DIR = Path(__file__).resolve().parent  # server/ML/rag/retrieval/
BASE_DIR = SCRIPT_DIR.parent                  # server/ML/rag/


@dataclass
class RetrievalResult:
    """Data class for retrieval results."""
    index: int
    text: str
    source: str
    category: str
    chunk_id: int
    document_id: str
    char_count: int
    distance: float
    relevance_score: float


class DocumentRetriever:
    """
    Retrieves relevant financial knowledge documents using FAISS.

    Attributes:
        embeddings_dir (Path): Directory containing embeddings and metadata
        model_name (str): Name of the sentence transformer model
        model: Loaded sentence transformer model
        index: FAISS index
        metadata: Chunk metadata
        cache: Query cache for performance
    """

    def __init__(
        self,
        model_name: str = 'all-MiniLM-L6-v2',
        enable_cache: bool = True
    ):
        """
        Initialize the document retriever with absolute paths.

        Args:
            model_name: Sentence transformer model to use
            enable_cache: Whether to cache queries
        """
        # Use absolute paths based on script location
        self.embeddings_dir = BASE_DIR / "embeddings"
        self.model_name = model_name
        self.model = None
        self.index = None
        self.metadata = []
        self.enable_cache = enable_cache
        self.cache = {}

        logger.info(f"DocumentRetriever initialized with model: {model_name}")

    def load_model(self) -> None:
        """Load the sentence transformer model."""
        try:
            logger.info(f"Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise

    def load_index(self, index_file: str = 'financial_knowledge.index') -> None:
        """
        Load FAISS index from disk.

        Args:
            index_file: Name of the index file
        """
        try:
            index_path = self.embeddings_dir / index_file

            if not index_path.exists():
                logger.error(f"Index file not found: {index_path}")
                raise FileNotFoundError(f"Index file not found: {index_path}")

            logger.info(f"Loading FAISS index from: {index_path}")
            self.index = faiss.read_index(str(index_path))
            logger.info(f"Index loaded with {self.index.ntotal} vectors")

        except Exception as e:
            logger.error(f"Error loading index: {e}")
            raise

    def load_metadata(self, metadata_file: str = 'embeddings_metadata.json') -> None:
        """
        Load chunk metadata from JSON file.

        Args:
            metadata_file: Name of the metadata file
        """
        try:
            metadata_path = self.embeddings_dir / metadata_file

            if not metadata_path.exists():
                logger.error(f"Metadata file not found: {metadata_path}")
                raise FileNotFoundError(f"Metadata file not found: {metadata_path}")

            logger.info(f"Loading metadata from: {metadata_path}")
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)

            logger.info(f"Loaded metadata for {len(self.metadata)} chunks")

        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            raise

    def encode_query(self, query: str) -> np.ndarray:
        """
        Encode a query string to embedding.

        Args:
            query: Query string

        Returns:
            Query embedding as numpy array
        """
        try:
            embedding = self.model.encode(query, convert_to_numpy=True)
            return embedding.astype('float32').reshape(1, -1)
        except Exception as e:
            logger.error(f"Error encoding query: {e}")
            raise

    def retrieve(
        self,
        query: str,
        k: int = 5,
        category: Optional[str] = None,
        threshold: float = 0.0
    ) -> List[RetrievalResult]:
        """
        Retrieve top-k relevant documents for a query.

        Args:
            query: Query string
            k: Number of results to retrieve
            category: Optional category filter
            threshold: Minimum relevance score threshold

        Returns:
            List of RetrievalResult objects
        """
        try:
            # Check cache
            cache_key = f"{query}_{k}_{category}_{threshold}"
            if self.enable_cache and cache_key in self.cache:
                logger.info(f"Cache hit for query: {query[:50]}...")
                return self.cache[cache_key]

            logger.info(f"Retrieving top-{k} documents for query: {query[:50]}...")

            # Encode query
            query_embedding = self.encode_query(query)

            # Search FAISS index
            distances, indices = self.index.search(query_embedding, k * 2)  # Get more to filter

            # Process results
            results = []
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx == -1:  # Invalid result
                    continue

                metadata = self.metadata[idx]

                # Filter by category if specified
                if category and metadata['category'] != category:
                    continue

                # Calculate relevance score (inverse of distance)
                relevance_score = 1.0 / (1.0 + distance)

                # Filter by threshold
                if relevance_score < threshold:
                    continue

                result = RetrievalResult(
                    index=idx,
                    text=metadata['text'],
                    source=metadata['source'],
                    category=metadata['category'],
                    chunk_id=metadata['chunk_id'],
                    document_id=metadata['document_id'],
                    char_count=metadata['char_count'],
                    distance=float(distance),
                    relevance_score=float(relevance_score)
                )
                results.append(result)

                if len(results) >= k:
                    break

            # Cache results
            if self.enable_cache:
                self.cache[cache_key] = results

            logger.info(f"Retrieved {len(results)} documents")

            return results

        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            raise

    def retrieve_by_category(
        self,
        query: str,
        category: str,
        k: int = 5
    ) -> List[RetrievalResult]:
        """
        Retrieve documents filtered by category.

        Args:
            query: Query string
            category: Category to filter by
            k: Number of results to retrieve

        Returns:
            List of RetrievalResult objects
        """
        return self.retrieve(query, k=k, category=category)

    def retrieve_similar(
        self,
        text: str,
        k: int = 5,
        exclude_source: Optional[str] = None
    ) -> List[RetrievalResult]:
        """
        Retrieve documents similar to given text.

        Args:
            text: Reference text
            k: Number of results to retrieve
            exclude_source: Source file to exclude from results

        Returns:
            List of RetrievalResult objects
        """
        try:
            logger.info(f"Retrieving similar documents for text: {text[:50]}...")

            # Encode text
            embedding = self.encode_query(text)

            # Search FAISS index
            distances, indices = self.index.search(embedding, k * 2)

            # Process results
            results = []
            for distance, idx in zip(distances[0], indices[0]):
                if idx == -1:
                    continue

                metadata = self.metadata[idx]

                # Exclude source if specified
                if exclude_source and metadata['source'] == exclude_source:
                    continue

                relevance_score = 1.0 / (1.0 + distance)

                result = RetrievalResult(
                    index=idx,
                    text=metadata['text'],
                    source=metadata['source'],
                    category=metadata['category'],
                    chunk_id=metadata['chunk_id'],
                    document_id=metadata['document_id'],
                    char_count=metadata['char_count'],
                    distance=float(distance),
                    relevance_score=float(relevance_score)
                )
                results.append(result)

                if len(results) >= k:
                    break

            logger.info(f"Retrieved {len(results)} similar documents")

            return results

        except Exception as e:
            logger.error(f"Error retrieving similar documents: {e}")
            raise

    def get_category_stats(self) -> Dict[str, int]:
        """
        Get statistics about categories in the knowledge base.

        Returns:
            Dictionary with category counts
        """
        stats = {}
        for metadata in self.metadata:
            category = metadata['category']
            stats[category] = stats.get(category, 0) + 1

        return dict(sorted(stats.items()))

    def search_by_keyword(
        self,
        keyword: str,
        k: int = 5
    ) -> List[RetrievalResult]:
        """
        Search documents by keyword (semantic search).

        Args:
            keyword: Search keyword
            k: Number of results to retrieve

        Returns:
            List of RetrievalResult objects
        """
        return self.retrieve(keyword, k=k)

    def initialize(self) -> None:
        """Initialize the retriever by loading all necessary components."""
        try:
            logger.info("Initializing DocumentRetriever")
            self.load_model()
            self.load_index()
            self.load_metadata()
            logger.info("DocumentRetriever initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing retriever: {e}")
            raise

    def print_results(self, results: List[RetrievalResult], query: str = "") -> None:
        """
        Print retrieval results in a formatted way.

        Args:
            results: List of retrieval results
            query: Original query (for display)
        """
        print("\n" + "=" * 80)
        if query:
            print(f"Query: {query}")
        print(f"Retrieved {len(results)} documents")
        print("=" * 80)

        for i, result in enumerate(results, 1):
            print(f"\n[{i}] {result.source} (Category: {result.category})")
            print(f"    Relevance: {result.relevance_score:.4f} | Distance: {result.distance:.4f}")
            print(f"    Document ID: {result.document_id}")
            print(f"    Text Preview: {result.text[:100]}...")

        print("\n" + "=" * 80)


def main():
    """Main entry point for testing the retriever."""
    try:
        # Initialize retriever with absolute paths
        retriever = DocumentRetriever(
            model_name='all-MiniLM-L6-v2'
        )
        retriever.initialize()

        # Test queries
        test_queries = [
            "How to start investing in mutual funds?",
            "What is SIP and how does it work?",
            "How to manage credit card debt?",
            "What are government schemes for savings?",
            "How to create a monthly budget?"
        ]

        print("\n" + "=" * 80)
        print("DOCUMENT RETRIEVER TEST")
        print("=" * 80)

        # Print category statistics
        print("\nCategory Statistics:")
        stats = retriever.get_category_stats()
        for category, count in stats.items():
            print(f"  {category}: {count} chunks")

        # Test retrieval
        for query in test_queries:
            results = retriever.retrieve(query, k=3)
            retriever.print_results(results, query)

        print("\n✅ Retriever test completed successfully!")

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"\n❌ Error: {e}")
        exit(1)


if __name__ == '__main__':
    main()
