"""
chunk_documents.py - Document Chunking Pipeline for RAG System

This module processes financial knowledge documents and creates semantic chunks
optimized for embedding generation and retrieval-augmented generation.

Features:
- Loads all .txt files from knowledge_base/
- Extracts document metadata (filename, category, content)
- Cleans text while preserving formatting
- Splits documents into semantic chunks with overlap
- Generates structured JSON output
- Provides comprehensive statistics and logging

Usage:
    python chunk_documents.py
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
import re
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get absolute base directory (ML/rag/)
SCRIPT_DIR = Path(__file__).resolve().parent  # ML/rag/embeddings/
BASE_DIR = SCRIPT_DIR.parent  # ML/rag/


class DocumentChunker:
    """
    Processes financial documents and creates semantic chunks for RAG.

    Attributes:
        knowledge_base_dir: Path to knowledge_base directory
        output_dir: Path to save chunked documents
        chunk_size: Target size for each chunk (characters)
        chunk_overlap: Overlap between consecutive chunks
    """

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ):
        """
        Initialize the DocumentChunker with absolute paths.

        Args:
            chunk_size: Target chunk size in characters
            chunk_overlap: Overlap between chunks in characters
        """
        # Use absolute paths based on script location
        self.knowledge_base_dir = BASE_DIR / "knowledge_base"
        self.output_dir = BASE_DIR / "embeddings"
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Statistics tracking
        self.stats = {
            'total_documents': 0,
            'total_chunks': 0,
            'total_characters': 0,
            'categories': {},
            'documents_processed': [],
            'errors': []
        }

        logger.info(f"DocumentChunker initialized")
        logger.info(f"Knowledge base: {self.knowledge_base_dir}")
        logger.info(f"Output directory: {self.output_dir}")
        logger.info(f"Chunk size: {self.chunk_size}, Overlap: {self.chunk_overlap}")

    def load_documents(self) -> List[Dict]:
        """
        Load all .txt files from knowledge_base directory.

        Returns:
            List of documents with metadata
        """
        documents = []

        if not self.knowledge_base_dir.exists():
            logger.error(f"Knowledge base directory not found: {self.knowledge_base_dir}")
            return documents

        logger.info(f"Loading documents from {self.knowledge_base_dir}")

        # Traverse all subdirectories
        for txt_file in self.knowledge_base_dir.rglob('*.txt'):
            try:
                # Extract category from parent directory
                category = txt_file.parent.name
                filename = txt_file.name

                # Read file content
                with open(txt_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                if not content.strip():
                    logger.warning(f"Empty file: {txt_file}")
                    self.stats['errors'].append(f"Empty file: {filename}")
                    continue

                # Create document object
                document = {
                    'filename': filename,
                    'category': category,
                    'content': content,
                    'file_path': str(txt_file),
                    'char_count': len(content)
                }

                documents.append(document)
                logger.info(f"Loaded: {category}/{filename} ({len(content)} chars)")

            except Exception as e:
                logger.error(f"Error loading {txt_file}: {str(e)}")
                self.stats['errors'].append(f"Error loading {txt_file}: {str(e)}")
                continue

        self.stats['total_documents'] = len(documents)
        logger.info(f"Total documents loaded: {len(documents)}")

        return documents

    def clean_text(self, text: str) -> str:
        """
        Clean text while preserving important formatting.

        Args:
            text: Raw text to clean

        Returns:
            Cleaned text
        """
        # Remove extra whitespace but preserve structure
        lines = text.split('\n')
        cleaned_lines = []

        for line in lines:
            # Strip leading/trailing whitespace from each line
            line = line.strip()

            # Skip empty lines but preserve them for structure
            if line or (cleaned_lines and cleaned_lines[-1]):
                cleaned_lines.append(line)

        # Join lines
        text = '\n'.join(cleaned_lines)

        # Remove multiple consecutive newlines (keep max 2)
        text = re.sub(r'\n\n\n+', '\n\n', text)

        # Remove tabs
        text = text.replace('\t', '  ')

        # Remove extra spaces within lines
        text = re.sub(r'  +', ' ', text)

        return text.strip()

    def extract_metadata(self, text: str) -> Dict:
        """
        Extract metadata from document text.

        Args:
            text: Document text

        Returns:
            Dictionary with extracted metadata
        """
        metadata = {
            'title': '',
            'category': '',
            'summary': '',
            'key_points': []
        }

        lines = text.split('\n')

        for i, line in enumerate(lines):
            if line.startswith('TITLE:'):
                metadata['title'] = line.replace('TITLE:', '').strip()
            elif line.startswith('CATEGORY:'):
                metadata['category'] = line.replace('CATEGORY:', '').strip()
            elif line.startswith('SUMMARY:'):
                metadata['summary'] = line.replace('SUMMARY:', '').strip()
            elif line.startswith('KEY POINTS:'):
                # Collect key points
                j = i + 1
                while j < len(lines) and lines[j].startswith('- '):
                    point = lines[j].replace('- ', '').strip()
                    if point:
                        metadata['key_points'].append(point)
                    j += 1

        return metadata

    def split_into_chunks(self, text: str, document_id: str) -> List[Dict]:
        """
        Split document into semantic chunks with overlap.

        Args:
            text: Document text to chunk
            document_id: Unique document identifier

        Returns:
            List of chunks with metadata
        """
        chunks = []

        # Split by paragraphs first (semantic boundaries)
        paragraphs = text.split('\n\n')

        current_chunk = ""
        chunk_id = 0

        for paragraph in paragraphs:
            paragraph = paragraph.strip()

            if not paragraph:
                continue

            # If adding paragraph exceeds chunk_size, save current chunk
            if len(current_chunk) + len(paragraph) > self.chunk_size and current_chunk:
                # Save chunk
                chunk_dict = {
                    'text': current_chunk.strip(),
                    'source': document_id.split('_')[1] + '.txt',
                    'category': document_id.split('_')[0],
                    'chunk_id': chunk_id,
                    'document_id': document_id,
                    'char_count': len(current_chunk.strip())
                }

                # Skip very short chunks
                if len(current_chunk.strip()) > 50:
                    chunks.append(chunk_dict)
                    chunk_id += 1

                # Create overlap by keeping last part of previous chunk
                overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else current_chunk
                current_chunk = overlap_text + '\n\n' + paragraph
            else:
                # Add paragraph to current chunk
                if current_chunk:
                    current_chunk += '\n\n' + paragraph
                else:
                    current_chunk = paragraph

        # Save final chunk
        if current_chunk.strip() and len(current_chunk.strip()) > 50:
            chunk_dict = {
                'text': current_chunk.strip(),
                'source': document_id.split('_')[1] + '.txt',
                'category': document_id.split('_')[0],
                'chunk_id': chunk_id,
                'document_id': document_id,
                'char_count': len(current_chunk.strip())
            }
            chunks.append(chunk_dict)

        return chunks

    def process_documents(self, documents: List[Dict]) -> List[Dict]:
        """
        Process all documents and create chunks.

        Args:
            documents: List of documents to process

        Returns:
            List of all chunks
        """
        all_chunks = []

        logger.info(f"Processing {len(documents)} documents...")

        for doc in documents:
            try:
                # Clean text
                cleaned_text = self.clean_text(doc['content'])

                # Create document ID
                document_id = f"{doc['category']}_{doc['filename'].replace('.txt', '')}"

                # Split into chunks
                chunks = self.split_into_chunks(cleaned_text, document_id)

                # Update statistics
                if doc['category'] not in self.stats['categories']:
                    self.stats['categories'][doc['category']] = {
                        'documents': 0,
                        'chunks': 0,
                        'characters': 0
                    }

                self.stats['categories'][doc['category']]['documents'] += 1
                self.stats['categories'][doc['category']]['chunks'] += len(chunks)
                self.stats['categories'][doc['category']]['characters'] += len(cleaned_text)

                self.stats['total_chunks'] += len(chunks)
                self.stats['total_characters'] += len(cleaned_text)
                self.stats['documents_processed'].append({
                    'filename': doc['filename'],
                    'category': doc['category'],
                    'chunks': len(chunks),
                    'characters': len(cleaned_text)
                })

                all_chunks.extend(chunks)

                logger.info(f"Processed: {document_id} -> {len(chunks)} chunks")

            except Exception as e:
                logger.error(f"Error processing {doc['filename']}: {str(e)}")
                self.stats['errors'].append(f"Error processing {doc['filename']}: {str(e)}")
                continue

        return all_chunks

    def remove_duplicate_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """
        Remove duplicate chunks based on text content.

        Args:
            chunks: List of chunks

        Returns:
            List of unique chunks
        """
        seen_texts = set()
        unique_chunks = []
        duplicates_removed = 0

        for chunk in chunks:
            # Create hash of chunk text
            text_hash = hash(chunk['text'][:100])  # Hash first 100 chars

            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                unique_chunks.append(chunk)
            else:
                duplicates_removed += 1

        logger.info(f"Removed {duplicates_removed} duplicate chunks")

        return unique_chunks

    def save_chunks(self, chunks: List[Dict], filename: str = 'chunked_documents.json') -> None:
        """
        Save chunks to JSON file.

        Args:
            chunks: List of chunks to save
            filename: Output filename
        """
        try:
            output_path = self.output_dir / filename
            logger.info(f"Saving {len(chunks)} chunks to {output_path}")

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(chunks, f, indent=2, ensure_ascii=False)

            logger.info(f"Chunks saved successfully")

        except Exception as e:
            logger.error(f"Error saving chunks: {str(e)}")
            raise

    def save_statistics(self, filename: str = 'chunking_statistics.json') -> None:
        """
        Save statistics to JSON file.

        Args:
            filename: Output filename
        """
        try:
            output_path = self.output_dir / filename
            logger.info(f"Saving statistics to {output_path}")

            stats_data = {
                'timestamp': datetime.now().isoformat(),
                **self.stats
            }

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(stats_data, f, indent=2)

            logger.info(f"Statistics saved successfully")

        except Exception as e:
            logger.error(f"Error saving statistics: {str(e)}")
            raise

    def print_statistics(self) -> None:
        """Print statistics to console."""
        print("\n" + "=" * 80)
        print("DOCUMENT CHUNKING STATISTICS")
        print("=" * 80)
        print(f"\nTotal Documents: {self.stats['total_documents']}")
        print(f"Total Chunks: {self.stats['total_chunks']}")
        print(f"Total Characters: {self.stats['total_characters']}")

        if self.stats['total_chunks'] > 0:
            avg_chunk_size = self.stats['total_characters'] / self.stats['total_chunks']
            print(f"Average Chunk Size: {avg_chunk_size:.0f} characters")

        print("\nCategory Distribution:")
        for category, data in sorted(self.stats['categories'].items()):
            print(f"  {category}:")
            print(f"    Documents: {data['documents']}")
            print(f"    Chunks: {data['chunks']}")
            print(f"    Characters: {data['characters']}")

        if self.stats['errors']:
            print(f"\nErrors ({len(self.stats['errors'])}):")
            for error in self.stats['errors']:
                print(f"  - {error}")

        print("\n" + "=" * 80)

    def run(self) -> None:
        """Run the complete chunking pipeline."""
        try:
            logger.info("Starting document chunking pipeline...")

            # Load documents
            documents = self.load_documents()

            if not documents:
                logger.error("No documents loaded. Exiting.")
                return

            # Process documents
            chunks = self.process_documents(documents)

            # Remove duplicates
            chunks = self.remove_duplicate_chunks(chunks)

            # Save chunks
            self.save_chunks(chunks)

            # Save statistics
            self.save_statistics()

            # Print statistics
            self.print_statistics()

            logger.info("Pipeline completed successfully")

        except Exception as e:
            logger.error(f"Pipeline failed: {str(e)}")
            raise


def main():
    """Main entry point for the chunking pipeline."""
    try:
        # Initialize chunker with absolute paths
        chunker = DocumentChunker(
            chunk_size=500,
            chunk_overlap=100
        )

        # Run pipeline
        chunker.run()

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        raise


if __name__ == '__main__':
    main()
