"""
rbi_scraper.py - Scraper for Reserve Bank of India financial guidelines

Scrapes official RBI content on:
- EMI guidelines
- Interest rates
- Loan regulations
- Consumer protection
- Financial literacy
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

# RBI official URLs for financial guidelines
RBI_URLS = {
    'emi_guidelines': 'https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx?Id=20',
    'interest_rates': 'https://www.rbi.org.in/scripts/RateNotification.aspx',
    'consumer_protection': 'https://www.rbi.org.in/scripts/FAQView.aspx?Id=77',
    'loan_guidelines': 'https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx?Id=19',
    'financial_literacy': 'https://www.rbi.org.in/scripts/FinancialLiteracy.aspx',
    'home_loan_guidelines': 'https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx?Id=18',
    'personal_loan_guidelines': 'https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx?Id=17',
    'credit_card_guidelines': 'https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx?Id=16',
}

# Alternative RBI URLs (if primary ones fail)
RBI_ALTERNATIVE_URLS = {
    'monetary_policy': 'https://www.rbi.org.in/scripts/MonetaryPolicy.aspx',
    'banking_regulation': 'https://www.rbi.org.in/scripts/BS_ViewBulletin.aspx',
    'deposit_insurance': 'https://www.rbi.org.in/scripts/FAQView.aspx?Id=78',
}


class RBIScraper:
    """Scraper for Reserve Bank of India financial content."""
    
    def __init__(self, output_dir: str = 'ml/rag/knowledge_base/rbi'):
        """
        Initialize RBI scraper.
        
        Args:
            output_dir: Directory to save scraped content
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.stats = ScrapingStats()
        logger.info(f"RBI Scraper initialized. Output: {self.output_dir}")
    
    def scrape_url(self, url: str, category: str = 'general') -> bool:
        """
        Scrape a single RBI URL.
        
        Args:
            url: URL to scrape
            category: Content category for organization
            
        Returns:
            True if successful, False otherwise
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
            title = f"RBI - {category.replace('_', ' ').title()}"
        
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
        Scrape all RBI URLs.
        
        Args:
            include_alternatives: Whether to include alternative URLs
            
        Returns:
            Scraping statistics
        """
        urls_to_scrape = RBI_URLS.copy()
        
        if include_alternatives:
            urls_to_scrape.update(RBI_ALTERNATIVE_URLS)
        
        logger.info(f"Starting RBI scraping. Total URLs: {len(urls_to_scrape)}")
        
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
        if category not in RBI_URLS:
            logger.error(f"Unknown category: {category}")
            return False
        
        url = RBI_URLS[category]
        return self.scrape_url(url, category)
    
    def get_stats(self) -> Dict:
        """Get scraping statistics."""
        return self.stats.get_summary()
    
    def print_summary(self):
        """Print scraping summary."""
        self.stats.print_summary()


def main():
    """Main function to run RBI scraper."""
    import sys
    
    # Initialize scraper
    scraper = RBIScraper()
    
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
        logger.info("Scraping all RBI content")
        scraper.scrape_all(include_alternatives=True)
    
    # Print summary
    scraper.print_summary()


if __name__ == '__main__':
    main()
