"""
Embedding Generation Pipeline for RAG System

This module generates embeddings for all chunked documents and stores them
in a vector database (FAISS) for efficient retrieval-augmented generation.

Features:
- Load chunked documents from JSON
- Generate embeddings using sentence transformers
- Store embeddings in FAISS index
- Save metadata for retrieval
- Generate comprehensive statistics
- Support for batch processing
- Error handling and logging

Author: Financial Advisor Team
Version: 1.0.0
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple
import time
from datetime import datetime

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

# Get absolute base directory (ML/rag/)
SCRIPT_DIR = Path(__file__).resolve().parent  # ML/rag/embeddings/
BASE_DIR = SCRIPT_DIR.parent  # ML/rag/


class EmbeddingGenerator:
    """
    Generates embeddings for financial knowledge chunks and stores them in FAISS.

    Attributes:
        model_name (str): Name of the sentence transformer model
        model: Loaded sentence transformer model
        embeddings_dir (Path): Directory for output files
        chunks_file (Path): Path to chunked documents JSON
        embedding_model: Loaded embedding model
        embeddings: Generated embeddings array
        metadata: Chunk metadata for retrieval
    """

    def __init__(
        self,
        model_name: str = 'all-MiniLM-L6-v2'
    ):
        """
        Initialize the embedding generator with absolute paths.

        Args:
            model_name: Sentence transformer model to use
        """
        # Use absolute paths based on script location
        self.embeddings_dir = BASE_DIR / "embeddings"
        self.chunks_file = self.embeddings_dir / "chunked_documents.json"
        self.model_name = model_name
        self.model = None
        self.embeddings = None
        self.metadata = []
        self.chunks = []

        logger.info(f"EmbeddingGenerator initialized with model: {model_name}")

    def load_model(self) -> None:
        """Load the sentence transformer model."""
        try:
            logger.info(f"Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Model loaded successfully. Embedding dimension: {self.model.get_embedding_dimension()}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise

    def load_chunks(self) -> None:
        """Load chunked documents from JSON file."""
        try:
            if not self.chunks_file.exists():
                logger.error(f"Chunks file not found: {self.chunks_file}")
                raise FileNotFoundError(f"Chunks file not found: {self.chunks_file}")

            logger.info(f"Loading chunks from: {self.chunks_file}")
            with open(self.chunks_file, 'r', encoding='utf-8') as f:
                self.chunks = json.load(f)

            logger.info(f"Loaded {len(self.chunks)} chunks")
        except Exception as e:
            logger.error(f"Error loading chunks: {e}")
            raise

    def generate_embeddings(self, batch_size: int = 32) -> np.ndarray:
        """
        Generate embeddings for all chunks.

        Args:
            batch_size: Number of chunks to process at once

        Returns:
            numpy array of embeddings
        """
        try:
            logger.info(f"Generating embeddings for {len(self.chunks)} chunks (batch_size={batch_size})")

            # Extract texts from chunks
            texts = [chunk['text'] for chunk in self.chunks]

            # Generate embeddings in batches
            start_time = time.time()
            embeddings_list = []

            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                batch_embeddings = self.model.encode(
                    batch_texts,
                    convert_to_numpy=True,
                    show_progress_bar=False
                )
                embeddings_list.append(batch_embeddings)

                if (i + batch_size) % (batch_size * 5) == 0:
                    logger.info(f"Processed {min(i + batch_size, len(texts))}/{len(texts)} chunks")

            # Concatenate all embeddings
            self.embeddings = np.vstack(embeddings_list)

            elapsed_time = time.time() - start_time
            logger.info(f"Embeddings generated in {elapsed_time:.2f}s")
            logger.info(f"Embeddings shape: {self.embeddings.shape}")

            return self.embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise

    def create_faiss_index(self) -> faiss.IndexFlatL2:
        """
        Create FAISS index from embeddings.

        Returns:
            FAISS index object
        """
        try:
            logger.info("Creating FAISS index")

            # Ensure embeddings are float32
            embeddings_float32 = self.embeddings.astype('float32')

            # Create index
            dimension = embeddings_float32.shape[1]
            index = faiss.IndexFlatL2(dimension)
            index.add(embeddings_float32)

            logger.info(f"FAISS index created with {index.ntotal} vectors")

            return index

        except Exception as e:
            logger.error(f"Error creating FAISS index: {e}")
            raise

    def save_index(self, index: faiss.IndexFlatL2, filename: str = 'financial_knowledge.index') -> None:
        """
        Save FAISS index to disk.

        Args:
            index: FAISS index object
            filename: Output filename
        """
        try:
            output_path = self.embeddings_dir / filename
            logger.info(f"Saving FAISS index to: {output_path}")
            faiss.write_index(index, str(output_path))
            logger.info("FAISS index saved successfully")
        except Exception as e:
            logger.error(f"Error saving FAISS index: {e}")
            raise

    def save_metadata(self, filename: str = 'embeddings_metadata.json') -> None:
        """
        Save chunk metadata for retrieval.

        Args:
            filename: Output filename
        """
        try:
            output_path = self.embeddings_dir / filename
            logger.info(f"Saving metadata to: {output_path}")

            # Create metadata list
            metadata = []
            for i, chunk in enumerate(self.chunks):
                metadata.append({
                    'index': i,
                    'text': chunk['text'],
                    'source': chunk['source'],
                    'category': chunk['category'],
                    'chunk_id': chunk['chunk_id'],
                    'document_id': chunk['document_id'],
                    'char_count': chunk['char_count']
                })

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            logger.info(f"Metadata saved for {len(metadata)} chunks")

        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
            raise

    def generate_statistics(self) -> Dict:
        """
        Generate comprehensive statistics about embeddings.

        Returns:
            Dictionary with statistics
        """
        try:
            logger.info("Generating statistics")

            # Calculate statistics
            stats = {
                'timestamp': datetime.now().isoformat(),
                'total_chunks': len(self.chunks),
                'embedding_dimension': self.embeddings.shape[1],
                'model_name': self.model_name,
                'embeddings_shape': list(self.embeddings.shape),
                'embeddings_dtype': str(self.embeddings.dtype),
                'embeddings_memory_mb': self.embeddings.nbytes / (1024 * 1024),
                'categories': {},
                'embedding_statistics': {
                    'mean': float(np.mean(self.embeddings)),
                    'std': float(np.std(self.embeddings)),
                    'min': float(np.min(self.embeddings)),
                    'max': float(np.max(self.embeddings)),
                    'median': float(np.median(self.embeddings))
                }
            }

            # Category statistics
            category_counts = {}
            for chunk in self.chunks:
                cat = chunk['category']
                if cat not in category_counts:
                    category_counts[cat] = 0
                category_counts[cat] += 1

            for category, count in sorted(category_counts.items()):
                stats['categories'][category] = {
                    'chunks': count,
                    'percentage': round(count / len(self.chunks) * 100, 2)
                }

            logger.info(f"Statistics generated: {len(self.chunks)} chunks, {len(stats['categories'])} categories")

            return stats

        except Exception as e:
            logger.error(f"Error generating statistics: {e}")
            raise

    def save_statistics(self, stats: Dict, filename: str = 'embeddings_statistics.json') -> None:
        """
        Save statistics to JSON file.

        Args:
            stats: Statistics dictionary
            filename: Output filename
        """
        try:
            output_path = self.embeddings_dir / filename
            logger.info(f"Saving statistics to: {output_path}")

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2)

            logger.info("Statistics saved successfully")

        except Exception as e:
            logger.error(f"Error saving statistics: {e}")
            raise

    def print_statistics(self, stats: Dict) -> None:
        """
        Print statistics to console.

        Args:
            stats: Statistics dictionary
        """
        print("\n" + "=" * 80)
        print("EMBEDDING GENERATION STATISTICS")
        print("=" * 80)
        print(f"\nTimestamp: {stats['timestamp']}")
        print(f"Model: {stats['model_name']}")
        print(f"Total Chunks: {stats['total_chunks']}")
        print(f"Embedding Dimension: {stats['embedding_dimension']}")
        print(f"Embeddings Shape: {stats['embeddings_shape']}")
        print(f"Memory Usage: {stats['embeddings_memory_mb']:.2f} MB")

        print("\nEmbedding Statistics:")
        emb_stats = stats['embedding_statistics']
        print(f"  Mean: {emb_stats['mean']:.6f}")
        print(f"  Std Dev: {emb_stats['std']:.6f}")
        print(f"  Min: {emb_stats['min']:.6f}")
        print(f"  Max: {emb_stats['max']:.6f}")
        print(f"  Median: {emb_stats['median']:.6f}")

        print("\nCategory Distribution:")
        for category, data in sorted(stats['categories'].items()):
            print(f"  {category}: {data['chunks']} chunks ({data['percentage']}%)")

        print("\n" + "=" * 80)

    def run(self) -> Tuple[faiss.IndexFlatL2, Dict]:
        """
        Run the complete embedding generation pipeline.

        Returns:
            Tuple of (FAISS index, statistics dictionary)
        """
        try:
            logger.info("Starting embedding generation pipeline")
            start_time = time.time()

            # Load model and chunks
            self.load_model()
            self.load_chunks()

            # Generate embeddings
            self.generate_embeddings()

            # Create and save FAISS index
            index = self.create_faiss_index()
            self.save_index(index)

            # Save metadata
            self.save_metadata()

            # Generate and save statistics
            stats = self.generate_statistics()
            self.save_statistics(stats)
            self.print_statistics(stats)

            elapsed_time = time.time() - start_time
            logger.info(f"Pipeline completed in {elapsed_time:.2f}s")

            return index, stats

        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            raise


def main():
    """Main entry point for embedding generation."""
    try:
        # Initialize generator with absolute paths
        generator = EmbeddingGenerator(
            model_name='all-MiniLM-L6-v2'  # Fast, efficient model
        )

        # Run pipeline
        index, stats = generator.run()

        print("\n✅ Embedding generation completed successfully!")
        print(f"\nOutput files:")
        print(f"  - FAISS Index: ML/rag/embeddings/financial_knowledge.index")
        print(f"  - Metadata: ML/rag/embeddings/embeddings_metadata.json")
        print(f"  - Statistics: ML/rag/embeddings/embeddings_statistics.json")

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"\n❌ Error: {e}")
        exit(1)


if __name__ == '__main__':
    main()
