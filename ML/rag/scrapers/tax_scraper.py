"""
tax_scraper.py - Scraper for Income Tax Department guidelines

Scrapes official Income Tax content on:
- Tax rates and slabs
- Deductions (80C, 80D, etc.)
- Filing procedures
- Tax-saving investments
- Compliance requirements
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

# Income Tax Department official URLs
TAX_URLS = {
    'tax_rates': 'https://www.incometax.gov.in/iec/faq/english/faq_rates.html',
    'deductions_80c': 'https://www.incometax.gov.in/iec/faq/english/faq_80c.html',
    'deductions_80d': 'https://www.incometax.gov.in/iec/faq/english/faq_80d.html',
    'filing_procedure': 'https://www.incometax.gov.in/iec/faq/english/faq_filing.html',
    'tax_saving_investments': 'https://www.incometax.gov.in/iec/faq/english/faq_investments.html',
    'home_loan_deduction': 'https://www.incometax.gov.in/iec/faq/english/faq_home_loan.html',
    'nps_deduction': 'https://www.incometax.gov.in/iec/faq/english/faq_nps.html',
    'medical_insurance': 'https://www.incometax.gov.in/iec/faq/english/faq_medical.html',
    'education_loan': 'https://www.incometax.gov.in/iec/faq/english/faq_education.html',
    'capital_gains': 'https://www.incometax.gov.in/iec/faq/english/faq_capital_gains.html',
}

# Alternative tax URLs
TAX_ALTERNATIVE_URLS = {
    'tax_calculator': 'https://www.incometax.gov.in/iec/faq/english/faq_calculator.html',
    'tds_information': 'https://www.incometax.gov.in/iec/faq/english/faq_tds.html',
    'gst_information': 'https://www.incometax.gov.in/iec/faq/english/faq_gst.html',
}


class TaxScraper:
    """Scraper for Income Tax Department content."""
    
    def __init__(self, output_dir: str = 'ml/rag/knowledge_base/tax'):
        """
        Initialize Tax scraper.
        
        Args:
            output_dir: Directory to save scraped content
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.stats = ScrapingStats()
        logger.info(f"Tax Scraper initialized. Output: {self.output_dir}")
    
    def scrape_url(self, url: str, category: str = 'general') -> bool:
        """
        Scrape a single tax URL.
        
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
            title = f"Income Tax - {category.replace('_', ' ').title()}"
        
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
        Scrape all tax URLs.
        
        Args:
            include_alternatives: Whether to include alternative URLs
            
        Returns:
            Scraping statistics
        """
        urls_to_scrape = TAX_URLS.copy()
        
        if include_alternatives:
            urls_to_scrape.update(TAX_ALTERNATIVE_URLS)
        
        logger.info(f"Starting Tax scraping. Total URLs: {len(urls_to_scrape)}")
        
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
        if category not in TAX_URLS:
            logger.error(f"Unknown category: {category}")
            return False
        
        url = TAX_URLS[category]
        return self.scrape_url(url, category)
    
    def get_stats(self) -> Dict:
        """Get scraping statistics."""
        return self.stats.get_summary()
    
    def print_summary(self):
        """Print scraping summary."""
        self.stats.print_summary()


def main():
    """Main function to run Tax scraper."""
    import sys
    
    # Initialize scraper
    scraper = TaxScraper()
    
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
        logger.info("Scraping all Tax content")
        scraper.scrape_all(include_alternatives=True)
    
    # Print summary
    scraper.print_summary()


if __name__ == '__main__':
    main()
