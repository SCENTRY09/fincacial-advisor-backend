# Document Chunking Pipeline - RAG System

## Overview

The document chunking pipeline processes financial knowledge documents and creates semantic chunks optimized for embedding generation and retrieval-augmented generation (RAG).

## Features

✅ **Semantic Chunking** - Splits documents at paragraph boundaries to preserve meaning
✅ **Context Overlap** - Maintains 100-character overlap between chunks for context preservation
✅ **Metadata Extraction** - Captures document metadata (title, category, summary, key points)
✅ **Duplicate Detection** - Removes duplicate chunks automatically
✅ **Comprehensive Statistics** - Tracks chunking metrics by category and document
✅ **Error Handling** - Gracefully handles corrupted files and encoding issues
✅ **Production-Ready** - Modular, well-documented, logging-enabled code

## Architecture

```
chunk_documents.py
├── DocumentChunker class
│   ├── load_documents()          # Load all .txt files
│   ├── clean_text()              # Clean and normalize text
│   ├── extract_metadata()        # Extract document metadata
│   ├── split_into_chunks()       # Create semantic chunks
│   ├── remove_duplicate_chunks() # Remove duplicates
│   ├── save_chunks()             # Save to JSON
│   ├── print_statistics()        # Display statistics
│   └── save_statistics()         # Save statistics to JSON
└── main()                        # Entry point
```

## Usage

### Basic Usage

```bash
python chunk_documents.py
```

### Configuration

Edit parameters in `main()` function:

```python
chunker = DocumentChunker(
    knowledge_base_dir='ml/rag/knowledge_base',  # Input directory
    output_dir='ml/rag/embeddings',              # Output directory
    chunk_size=500,                              # Target chunk size (chars)
    chunk_overlap=100                            # Overlap between chunks (chars)
)
```

## Output Files

### 1. chunked_documents.json

Contains all chunks with metadata:

```json
[
  {
    "text": "Chunk content here...",
    "source": "sip_basics.txt",
    "category": "investment",
    "chunk_id": 0,
    "document_id": "investment_sip_basics",
    "char_count": 432
  },
  ...
]
```

### 2. chunking_statistics.json

Contains comprehensive statistics:

```json
{
  "total_documents": 35,
  "total_chunks": 228,
  "total_characters": 73634,
  "categories": {
    "investment": {
      "documents": 6,
      "chunks": 43,
      "characters": 13625
    },
    ...
  },
  "documents_processed": [...],
  "errors": []
}
```

## Chunking Strategy

### Semantic Boundaries

Documents are split at paragraph boundaries (double newlines) to preserve semantic meaning:

```
Document
├── Paragraph 1 ─┐
├── Paragraph 2  ├─ Chunk 1 (with overlap)
├── Paragraph 3 ─┤
├── Paragraph 4 ─┐
├── Paragraph 5  ├─ Chunk 2 (with overlap)
└── Paragraph 6 ─┘
```

### Overlap Mechanism

- **Chunk Size**: 500 characters (target)
- **Overlap**: 100 characters (context preservation)
- **Minimum Chunk Size**: 50 characters (skip very short chunks)

### Example

```
Chunk 1: "...important concept. This is the overlap text that..."
Chunk 2: "...overlap text that continues into the next chunk..."
```

## Statistics

### Current Results

```
Total Documents: 35
Total Chunks: 228
Average Chunk Size: 323 characters

By Category:
- Investment: 43 chunks (13,625 chars)
- Tax: 40 chunks (13,050 chars)
- Government Schemes: 29 chunks (9,796 chars)
- Debt Management: 25 chunks (7,520 chars)
- Budgeting: 24 chunks (7,349 chars)
- RBI Banking: 23 chunks (7,511 chars)
- Insurance: 17 chunks (6,088 chars)
- Emergency Fund: 17 chunks (5,573 chars)
- RBI: 10 chunks (3,122 chars)
```

## Metadata Structure

Each chunk contains:

| Field | Description | Example |
|-------|-------------|---------|
| `text` | Chunk content | "SIP is a disciplined..." |
| `source` | Original filename | "sip_basics.txt" |
| `category` | Document category | "investment" |
| `chunk_id` | Chunk sequence number | 0, 1, 2, ... |
| `document_id` | Unique document ID | "investment_sip_basics" |
| `char_count` | Chunk character count | 432 |

## Integration with RAG

### Step 1: Load Chunks

```python
import json

with open('ml/rag/embeddings/chunked_documents.json', 'r') as f:
    chunks = json.load(f)
```

### Step 2: Generate Embeddings

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode([chunk['text'] for chunk in chunks])
```

### Step 3: Store in Vector Database

```python
# Example with FAISS
import faiss
import numpy as np

embeddings_array = np.array(embeddings).astype('float32')
index = faiss.IndexFlatL2(embeddings_array.shape[1])
index.add(embeddings_array)
```

### Step 4: Retrieve for RAG

```python
# Query
query = "How to start SIP investing?"
query_embedding = model.encode([query])[0]

# Search
distances, indices = index.search(np.array([query_embedding]).astype('float32'), k=5)

# Get results
results = [chunks[i] for i in indices[0]]
```

## Quality Metrics

### Chunk Size Distribution

- **Minimum**: 50 characters (enforced)
- **Average**: 323 characters
- **Maximum**: ~500 characters (target)

### Coverage

- **Total Documents**: 35
- **Total Chunks**: 228
- **Avg Chunks per Document**: 6.5
- **Duplicate Chunks Removed**: 0

### Categories Covered

- Investment (6 documents)
- Tax (5 documents)
- Government Schemes (5 documents)
- Debt Management (4 documents)
- Budgeting (4 documents)
- RBI Banking (4 documents)
- Insurance (3 documents)
- Emergency Fund (3 documents)
- RBI (1 document)

## Error Handling

The pipeline handles:

- ✅ Empty files
- ✅ Encoding issues (UTF-8)
- ✅ Missing directories
- ✅ Corrupted text
- ✅ Very short chunks
- ✅ Duplicate content

All errors are logged and saved to `chunking_statistics.json`.

## Performance

- **Processing Time**: < 1 second for 35 documents
- **Memory Usage**: Minimal (< 50MB)
- **Output Size**: ~137KB JSON (228 chunks)

## Customization

### Adjust Chunk Size

```python
chunker = DocumentChunker(
    chunk_size=300,      # Smaller chunks
    chunk_overlap=50     # Less overlap
)
```

### Filter by Category

```python
# In process_documents() method
if doc['category'] == 'investment':
    chunks = self.split_into_chunks(cleaned_text, document_id)
```

### Custom Splitting Strategy

Modify `split_into_chunks()` method:

```python
def split_into_chunks(self, text: str, document_id: str) -> List[Dict]:
    # Custom splitting logic here
    pass
```

## Logging

All operations are logged with timestamps:

```
2026-05-27 10:42:59,815 - __main__ - INFO - DocumentChunker initialized
2026-05-27 10:42:59,825 - __main__ - INFO - Loaded: investment/sip_basics.txt (1809 chars)
2026-05-27 10:42:59,829 - __main__ - INFO - Processed: investment_sip_basics -> 7 chunks
2026-05-27 10:42:59,835 - __main__ - INFO - Saved 228 chunks to ml\rag\embeddings\chunked_documents.json
```

## Next Steps

1. **Generate Embeddings**: Use `chunked_documents.json` to create embeddings
2. **Build Vector Store**: Store embeddings in FAISS or similar
3. **Implement Retrieval**: Create retrieval function for RAG
4. **Test RAG Pipeline**: Verify end-to-end functionality

## Troubleshooting

### No chunks generated

- Check knowledge_base directory exists
- Verify .txt files are readable
- Check file encoding (should be UTF-8)

### Chunks too small

- Increase `chunk_size` parameter
- Reduce `chunk_overlap` parameter

### Chunks too large

- Decrease `chunk_size` parameter
- Increase `chunk_overlap` parameter

### Memory issues

- Process documents in batches
- Reduce chunk_size
- Clear processed documents from memory

## References

- [LangChain Text Splitters](https://python.langchain.com/docs/modules/data_connection/document_loaders/how_to/split_code)
- [Semantic Chunking](https://www.pinecone.io/learn/chunking-strategies/)
- [RAG Best Practices](https://docs.llamaindex.ai/en/stable/module_guides/indexing/document_chunking/)

---

**Version**: 1.0.0
**Last Updated**: May 27, 2026
**Status**: Production Ready
