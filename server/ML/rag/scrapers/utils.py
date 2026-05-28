"""
utils.py - Utility functions for financial knowledge scraping pipeline

Provides reusable functions for:
- Fetching web pages safely
- Cleaning and normalizing text
- Extracting main content
- Saving structured documents
- Handling errors gracefully
"""

import requests
import re
import logging
from pathlib import Path
from typing import Optional, List, Dict
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Request headers to avoid being blocked
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}

# Timeout for requests (in seconds)
REQUEST_TIMEOUT = 10

# Tags to remove completely
TAGS_TO_REMOVE = [
    'script', 'style', 'nav', 'footer', 'header',
    'aside', 'noscript', 'meta', 'link', 'iframe',
    'form', 'button', 'input', 'select', 'textarea'
]

# CSS selectors for common junk content
JUNK_SELECTORS = [
    '.advertisement', '.ad', '.ads',
    '.sidebar', '.widget',
    '.social-share', '.share-buttons',
    '.related-posts', '.comments',
    '.breadcrumb', '.pagination',
    '.cookie-notice', '.popup'
]


def fetch_page(url: str, timeout: int = REQUEST_TIMEOUT) -> Optional[str]:
    """
    Safely fetch a webpage with proper error handling.
    
    Args:
        url: The URL to fetch
        timeout: Request timeout in seconds
        
    Returns:
        HTML content as string, or None if fetch fails
    """
    try:
        logger.info(f"Fetching: {url}")
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=timeout,
            allow_redirects=True
        )
        response.raise_for_status()
        
        # Check if content is HTML
        if 'text/html' not in response.headers.get('content-type', ''):
            logger.warning(f"Non-HTML content type: {response.headers.get('content-type')}")
            return None
        
        logger.info(f"Successfully fetched: {url} ({len(response.content)} bytes)")
        return response.text
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching {url}")
        return None
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error fetching {url}")
        return None
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error {e.response.status_code} for {url}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {str(e)}")
        return None


def extract_main_content(html: str, url: str = "") -> Optional[str]:
    """
    Extract main content from HTML, removing navigation, ads, and junk.
    
    Args:
        html: HTML content as string
        url: Original URL (for resolving relative links)
        
    Returns:
        Cleaned text content, or None if extraction fails
    """
    try:
        soup = BeautifulSoup(html, 'lxml')
        
        # Remove unwanted tags completely
        for tag in TAGS_TO_REMOVE:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Remove junk content by CSS selectors
        for selector in JUNK_SELECTORS:
            for element in soup.select(selector):
                element.decompose()
        
        # Try to find main content area
        main_content = None
        
        # Try common main content containers
        for selector in ['main', 'article', '[role="main"]', '.content', '.main-content', '.post-content']:
            main_content = soup.select_one(selector)
            if main_content:
                logger.info(f"Found main content using selector: {selector}")
                break
        
        # If no main content found, use body
        if not main_content:
            main_content = soup.find('body')
            if not main_content:
                logger.warning("Could not find body tag")
                return None
        
        # Extract text
        text = main_content.get_text(separator='\n', strip=True)
        
        if not text or len(text.strip()) < 100:
            logger.warning("Extracted content is too short")
            return None
        
        return text
        
    except Exception as e:
        logger.error(f"Error extracting content: {str(e)}")
        return None


def clean_text(text: str) -> str:
    """
    Clean and normalize text content.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove multiple newlines
    text = re.sub(r'\n\n+', '\n', text)
    
    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Remove common junk patterns
    # Remove email addresses (to avoid spam)
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL]', text)
    
    # Remove phone numbers
    text = re.sub(r'\+?\d{1,3}[-.]?\d{1,4}[-.]?\d{1,4}[-.]?\d{1,9}', '[PHONE]', text)
    
    # Remove URLs (keep only domain)
    text = re.sub(r'https?://[^\s]+', '[URL]', text)
    
    # Remove excessive punctuation
    text = re.sub(r'([!?.]){2,}', r'\1', text)
    
    # Remove special characters but keep important ones
    text = re.sub(r'[^a-zA-Z0-9\s\n.,;:()\\-₹%]', '', text)
    
    # Remove lines that are just numbers or special characters
    lines = [line for line in text.split('\n') if line and not re.match(r'^[^a-zA-Z]*$', line)]
    text = '\n'.join(lines)
    
    return text.strip()


def remove_duplicate_lines(text: str) -> str:
    """
    Remove duplicate consecutive lines while preserving order.
    
    Args:
        text: Text with potential duplicates
        
    Returns:
        Text with duplicates removed
    """
    lines = text.split('\n')
    unique_lines = []
    prev_line = None
    
    for line in lines:
        line = line.strip()
        if line and line != prev_line:
            unique_lines.append(line)
            prev_line = line
    
    return '\n'.join(unique_lines)


def extract_title(html: str) -> Optional[str]:
    """
    Extract title from HTML.
    
    Args:
        html: HTML content
        
    Returns:
        Title string or None
    """
    try:
        soup = BeautifulSoup(html, 'lxml')
        
        # Try different title sources
        title = None
        
        # Try <title> tag
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
        
        # Try <h1> tag
        if not title:
            h1 = soup.find('h1')
            if h1:
                title = h1.get_text(strip=True)
        
        # Try og:title meta tag
        if not title:
            og_title = soup.find('meta', property='og:title')
            if og_title:
                title = og_title.get('content', '').strip()
        
        return title if title else None
        
    except Exception as e:
        logger.error(f"Error extracting title: {str(e)}")
        return None


def generate_filename(title: str, url: str = "") -> str:
    """
    Generate a clean filename from title or URL.
    
    Args:
        title: Document title
        url: Document URL (fallback)
        
    Returns:
        Clean filename without extension
    """
    # Use title if available
    if title:
        filename = title.lower()
    else:
        # Extract from URL
        parsed = urlparse(url)
        filename = parsed.path.split('/')[-1] or parsed.netloc
    
    # Remove special characters
    filename = re.sub(r'[^a-z0-9\s-]', '', filename)
    
    # Replace spaces with underscores
    filename = re.sub(r'\s+', '_', filename)
    
    # Remove multiple underscores
    filename = re.sub(r'_+', '_', filename)
    
    # Limit length
    filename = filename[:100]
    
    # Remove trailing underscores
    filename = filename.rstrip('_')
    
    return filename if filename else 'document'


def save_to_txt(
    content: str,
    title: str,
    source_url: str,
    output_dir: Path,
    filename: Optional[str] = None
) -> Optional[Path]:
    """
    Save cleaned content to a structured text file.
    
    Args:
        content: Cleaned text content
        title: Document title
        source_url: Original source URL
        output_dir: Directory to save file
        filename: Optional custom filename (without extension)
        
    Returns:
        Path to saved file, or None if save fails
    """
    try:
        # Create output directory if it doesn't exist
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename if not provided
        if not filename:
            filename = generate_filename(title, source_url)
        
        # Create file path
        file_path = output_dir / f"{filename}.txt"
        
        # Avoid overwriting existing files
        counter = 1
        while file_path.exists():
            file_path = output_dir / f"{filename}_{counter}.txt"
            counter += 1
        
        # Format document
        document = f"""TITLE: {title}

SOURCE: {source_url}

SCRAPED: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{'='*80}

{content}

{'='*80}

END OF DOCUMENT
"""
        
        # Save to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(document)
        
        logger.info(f"Saved to: {file_path}")
        return file_path
        
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        return None


def is_empty_content(text: str, min_length: int = 200) -> bool:
    """
    Check if extracted content is too short or empty.
    
    Args:
        text: Text to check
        min_length: Minimum acceptable length
        
    Returns:
        True if content is empty/too short
    """
    return not text or len(text.strip()) < min_length


def get_domain(url: str) -> str:
    """
    Extract domain from URL.
    
    Args:
        url: Full URL
        
    Returns:
        Domain name
    """
    parsed = urlparse(url)
    return parsed.netloc.replace('www.', '')


class ScrapingStats:
    """Track scraping statistics."""
    
    def __init__(self):
        self.total_urls = 0
        self.successful = 0
        self.failed = 0
        self.empty = 0
        self.saved = 0
        self.start_time = datetime.now()
    
    def add_success(self):
        self.successful += 1
    
    def add_failure(self):
        self.failed += 1
    
    def add_empty(self):
        self.empty += 1
    
    def add_saved(self):
        self.saved += 1
    
    def get_summary(self) -> Dict:
        """Get scraping summary."""
        duration = (datetime.now() - self.start_time).total_seconds()
        return {
            'total_urls': self.total_urls,
            'successful': self.successful,
            'failed': self.failed,
            'empty': self.empty,
            'saved': self.saved,
            'duration_seconds': duration,
            'success_rate': f"{(self.successful / self.total_urls * 100):.1f}%" if self.total_urls > 0 else "0%"
        }
    
    def print_summary(self):
        """Print scraping summary."""
        summary = self.get_summary()
        print(f"\n{'='*60}")
        print("SCRAPING SUMMARY")
        print(f"{'='*60}")
        print(f"Total URLs processed: {summary['total_urls']}")
        print(f"Successful: {summary['successful']}")
        print(f"Failed: {summary['failed']}")
        print(f"Empty content: {summary['empty']}")
        print(f"Documents saved: {summary['saved']}")
        print(f"Success rate: {summary['success_rate']}")
        print(f"Duration: {summary['duration_seconds']:.1f} seconds")
        print(f"{'='*60}\n")
