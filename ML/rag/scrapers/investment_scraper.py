"""
investment_scraper.py - Scraper for Investment Education

Scrapes official investment content on:
- Mutual Funds
- Stock Market Basics
- SIP (Systematic Investment Plan)
- ETFs
- Bonds
- Investment Risk Management
"""

import logging
from pathlib import Path
from typing import List, Dict
from utils import (
    fetch_page, extract_main_content, clean_text,
    remove_duplicate_lines, extract_title, save_to_txt,
    is_empty_content, ScrapingStats
)

logger = logging.getLogger(__name__)

# Investment education URLs
INVESTMENT_URLS = {
    'mutual_funds_basics': 'https://www.amfiindia.com/investor-education/mutual-fund-basics',
    'sip_guide': 'https://www.amfiindia.com/investor-education/sip-guide',
    'investment_risk': 'https://www.amfiindia.com/investor-education/investment-risk',
    'portfolio_management': 'https://www.amfiindia.com/investor-education/portfolio-management',
    'etf_information': 'https://www.amfiindia.com/investor-education/etf-information',
    'sebi_investor_protection': 'https://www.sebi.gov.in/investor-education',
    'stock_market_basics': 'https://www.sebi.gov.in/investor-education/stock-market-basics',
    'bonds_and_debentures': 'https://www.sebi.gov.in/investor-education/bonds-and-debentures',
}

# Alternative investment URLs
INVESTMENT_ALTERNATIVE_URLS = {
    'nse_education': 'https://www.nseindia.com/education',
    'bse_education': 'https://www.bseindia.com/investors/education.aspx',
    'investment_glossary': 'https://www.amfiindia.com/investor-education/glossary',
}


class InvestmentScraper:
    """Scraper for Investment Education content."""
    
    def __init__(self, output_dir: str = 'ml/rag/knowledge_base/investment'):
        """
        Initialize Investment scraper.
        
        Args:
            output_dir: Directory to save scraped content
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.stats = ScrapingStats()
        logger.info(f"Investment Scraper initialized. Output: {self.output_dir}")
    
    def scrape_url(self, url: str, category: str = 'general') -> bool:
        """
        Scrape a single investment URL.
        
        Args:
            url: URL to scrape
            category: Content category
            
        Returns:
            True if successful
        """
        self.stats.total_urls += 1
        
        logger.info(f"Scraping: {url}")
        
        # Fetch page
        html = fetch_page(url)
        if not html:
            self.stats.add_failure()
            return False
        
        # Extract content
        content = extract_main_content(html, url)
        if not content:
            self.stats.add_failure()
            return False
        
        # Check if content is empty
        if is_empty_content(content):
            logger.warning(f"Empty content from {url}")
            self.stats.add_empty()
            return False
        
        # Clean text
        content = clean_text(content)
        content = remove_duplicate_lines(content)
        
        # Extract title
        title = extract_title(html)
        if not title:
            title = f"Investment - {category.replace('_', ' ').title()}"
        
        # Save to file
        category_dir = self.output_dir / category
        file_path = save_to_txt(
            content=content,
            title=title,
            source_url=url,
            output_dir=category_dir
        )
        
        if file_path:
            self.stats.add_success()
            self.stats.add_saved()
            return True
        else:
            self.stats.add_failure()
            return False
    
    def scrape_all(self, include_alternatives: bool = False) -> Dict:
        """
        Scrape all investment URLs.
        
        Args:
            include_alternatives: Whether to include alternative URLs
            
        Returns:
            Scraping statistics
        """
        urls_to_scrape = INVESTMENT_URLS.copy()
        
        if include_alternatives:
            urls_to_scrape.update(INVESTMENT_ALTERNATIVE_URLS)
        
        logger.info(f"Starting Investment scraping. Total URLs: {len(urls_to_scrape)}")
        
        for category, url in urls_to_scrape.items():
            self.scrape_url(url, category)
        
        return self.stats.get_summary()
    
    def scrape_category(self, category: str) -> bool:
        """
        Scrape a specific category.
        
        Args:
            category: Category name
            
        Returns:
            True if successful
        """
        if category not in INVESTMENT_URLS:
            logger.error(f"Unknown category: {category}")
            return False
        
        url = INVESTMENT_URLS[category]
        return self.scrape_url(url, category)
    
    def get_stats(self) -> Dict:
        """Get scraping statistics."""
        return self.stats.get_summary()
    
    def print_summary(self):
        """Print scraping summary."""
        self.stats.print_summary()


def main():
    """Main function to run Investment scraper."""
    import sys
    
    # Initialize scraper
    scraper = InvestmentScraper()
    
    # Check command line arguments
    if len(sys.argv) > 1:
        category = sys.argv[1]
        logger.info(f"Scraping category: {category}")
        success = scraper.scrape_category(category)
        if success:
            print(f"✓ Successfully scraped {category}")
        else:
            print(f"✗ Failed to scrape {category}")
    else:
        # Scrape all
        logger.info("Scraping all Investment content")
        scraper.scrape_all(include_alternatives=True)
    
    # Print summary
    scraper.print_summary()


if __name__ == '__main__':
    main()
