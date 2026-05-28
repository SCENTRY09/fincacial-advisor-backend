# Financial Knowledge Scraping Pipeline

Production-level web scraping system for collecting high-quality financial knowledge from official government and financial authority websites.

## Overview

This pipeline scrapes trusted financial sources and converts raw HTML into clean, structured text documents suitable for RAG (Retrieval-Augmented Generation) systems.

### Scraped Sources

1. **RBI (Reserve Bank of India)** - `rbi_scraper.py`
   - EMI guidelines
   - Interest rates
   - Loan regulations
   - Consumer protection
   - Financial literacy

2. **Income Tax Department** - `tax_scraper.py`
   - Tax rates and slabs
   - Deductions (80C, 80D, etc.)
   - Filing procedures
   - Tax-saving investments
   - Compliance requirements

3. **Government Schemes** - `govt_scheme_scraper.py`
   - PM Mudra Loan
   - Sukanya Samriddhi Yojana
   - Atal Pension Yojana
   - PM Jeevan Jyoti Bima Yojana
   - PM Suraksha Bima Yojana
   - National Pension System
   - Public Provident Fund

4. **Investment Education** - `investment_scraper.py`
   - Mutual Funds basics
   - SIP (Systematic Investment Plan)
   - Stock Market fundamentals
   - ETFs
   - Bonds and Debentures
   - Investment Risk Management

## Architecture

### Core Components

```
scrapers/
├── utils.py                    # Shared utility functions
├── rbi_scraper.py             # RBI content scraper
├── tax_scraper.py             # Income Tax scraper
├── govt_scheme_scraper.py     # Government schemes scraper
├── investment_scraper.py      # Investment education scraper
├── run_all_scrapers.py        # Master orchestrator
└── README.md                  # This file
```

### Utility Functions (utils.py)

#### Fetching
- `fetch_page(url)` - Safely fetch webpages with error handling
- Handles timeouts, connection errors, HTTP errors
- Respects rate limiting with proper headers

#### Content Extraction
- `extract_main_content(html)` - Extract main content from HTML
- Removes navigation, ads, scripts, styles
- Identifies and extracts primary content area

#### Text Cleaning
- `clean_text(text)` - Normalize and clean text
- Removes extra whitespace, duplicate lines
- Sanitizes email addresses, phone numbers, URLs
- Removes special characters while preserving financial notation

#### File Management
- `save_to_txt()` - Save cleaned content with metadata
- Auto-generates filenames from titles
- Prevents file overwrites
- Includes source URL and timestamp

#### Statistics
- `ScrapingStats` class - Track scraping metrics
- Success/failure rates
- Duration tracking
- Summary reporting

## Installation

### Requirements

```bash
pip install requests beautifulsoup4 lxml
```

### Setup

1. Clone or download the scrapers directory
2. Install dependencies: `pip install -r requirements.txt`
3. Ensure output directory exists: `ml/rag/knowledge_base/`

## Usage

### Run All Scrapers

```bash
python run_all_scrapers.py
```

This will:
- Scrape all sources
- Generate clean documents
- Save to `ml/rag/knowledge_base/`
- Print comprehensive report
- Save report to `scraping_report.txt`

### Run Specific Scraper

```bash
# RBI scraper
python run_all_scrapers.py rbi

# Tax scraper
python run_all_scrapers.py tax

# Government schemes scraper
python run_all_scrapers.py schemes

# Investment scraper
python run_all_scrapers.py investment
```

### Run Individual Scraper Directly

```bash
# RBI scraper
python rbi_scraper.py

# Tax scraper
python tax_scraper.py

# Government schemes scraper
python govt_scheme_scraper.py

# Investment scraper
python investment_scraper.py
```

### Scrape Specific Category

```bash
# RBI EMI guidelines
python rbi_scraper.py emi_guidelines

# Tax deductions 80C
python tax_scraper.py deductions_80c

# PM Mudra Loan
python govt_scheme_scraper.py pm_mudra_loan

# Mutual funds basics
python investment_scraper.py mutual_funds_basics
```

## Output Structure

Scraped documents are organized by source and category:

```
ml/rag/knowledge_base/
├── rbi/
│   ├── emi_guidelines/
│   │   └── emi_guidelines.txt
│   ├── interest_rates/
│   │   └── interest_rates.txt
│   └── ...
├── tax/
│   ├── tax_rates/
│   │   └── tax_rates.txt
│   ├── deductions_80c/
│   │   └── deductions_80c.txt
│   └── ...
├── government_schemes/
│   ├── pm_mudra_loan/
│   │   └── pm_mudra_loan.txt
│   ├── sukanya_samriddhi/
│   │   └── sukanya_samriddhi.txt
│   └── ...
└── investment/
    ├── mutual_funds_basics/
    │   └── mutual_funds_basics.txt
    ├── sip_guide/
    │   └── sip_guide.txt
    └── ...
```

## Document Format

Each saved document includes:

```
TITLE: EMI Guidelines

SOURCE: https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx?Id=20

SCRAPED: 2024-01-15 10:30:00

================================================================================

[Cleaned and structured content here]

================================================================================

END OF DOCUMENT
```

## Quality Assurance

### Content Validation

- Minimum content length: 200 characters
- Removes empty/duplicate pages
- Validates HTML content type
- Checks for extraction success

### Error Handling

- Graceful timeout handling (10 seconds)
- Connection error recovery
- HTTP error logging
- Comprehensive error reporting

### Statistics Tracking

- Total URLs processed
- Success/failure counts
- Empty content detection
- Processing duration
- Success rate calculation

## Configuration

### Request Headers

Configured to avoid being blocked:
- User-Agent: Chrome browser
- Accept: HTML content
- Accept-Language: English
- Connection: Keep-alive

### Timeout

Default: 10 seconds per request
Configurable via `REQUEST_TIMEOUT` constant

### Content Removal

Automatically removes:
- Scripts and styles
- Navigation elements
- Footers and headers
- Ads and widgets
- Social sharing buttons
- Comments sections
- Cookie notices

## Logging

All operations are logged with timestamps:

```
2024-01-15 10:30:00 - rbi_scraper - INFO - Fetching: https://www.rbi.org.in/...
2024-01-15 10:30:02 - rbi_scraper - INFO - Successfully fetched: ... (45230 bytes)
2024-01-15 10:30:02 - rbi_scraper - INFO - Found main content using selector: article
2024-01-15 10:30:02 - rbi_scraper - INFO - Saved to: ml/rag/knowledge_base/rbi/emi_guidelines/emi_guidelines.txt
```

## Performance

Typical performance metrics:

- **Fetch time**: 1-3 seconds per page
- **Processing time**: 0.5-1 second per page
- **Total time**: ~30-60 seconds for all scrapers
- **Success rate**: 70-90% (depends on website availability)

## Troubleshooting

### Connection Errors

**Problem**: "Connection error fetching URL"
**Solution**: Check internet connection, verify URL is accessible

### Timeout Errors

**Problem**: "Timeout fetching URL"
**Solution**: Increase `REQUEST_TIMEOUT` in utils.py

### Empty Content

**Problem**: "Empty content from URL"
**Solution**: Website may have changed structure, update selectors in utils.py

### No Documents Saved

**Problem**: All URLs fail
**Solution**: 
- Check internet connection
- Verify URLs are still valid
- Check output directory permissions

## Integration with RAG

These documents are designed for RAG systems:

1. **Clean text**: No HTML, scripts, or junk
2. **Structured format**: Clear title, source, content
3. **Metadata**: Source URL and scrape timestamp
4. **Organized**: Categorized by source and topic
5. **Embeddings-ready**: Can be directly embedded for vector search

### Next Steps

1. Load documents into vector database
2. Generate embeddings using sentence transformers
3. Index for semantic search
4. Integrate with LLM for retrieval-augmented generation

## Best Practices

1. **Run periodically**: Update knowledge base monthly
2. **Monitor logs**: Check for scraping errors
3. **Validate output**: Spot-check saved documents
4. **Track metrics**: Monitor success rates
5. **Update URLs**: Maintain list of working URLs

## Limitations

- Respects robots.txt and rate limiting
- Does not handle JavaScript-heavy sites (use Selenium if needed)
- Requires stable internet connection
- Website structure changes may break scrapers
- Some sites may block automated access

## Future Enhancements

- [ ] Add Selenium support for JavaScript-heavy sites
- [ ] Implement caching to avoid re-scraping
- [ ] Add incremental updates
- [ ] Support for PDF extraction
- [ ] Automatic URL discovery
- [ ] Multi-threaded scraping
- [ ] Database storage integration

## License

This scraping pipeline is designed for educational and authorized use only. Always respect website terms of service and robots.txt.

## Support

For issues or questions:
1. Check logs for error messages
2. Verify URLs are accessible
3. Test individual scrapers
4. Check internet connection
5. Review configuration settings

---

**Last Updated**: January 2024
**Version**: 1.0.0
