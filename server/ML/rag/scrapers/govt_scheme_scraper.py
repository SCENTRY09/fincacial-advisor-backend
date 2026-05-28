"""
govt_scheme_scraper.py - Scraper for Government Schemes

Scrapes official government content on:
- PM Mudra Loan
- Sukanya Samriddhi Yojana
- Atal Pension Yojana
- PM Jeevan Jyoti Bima Yojana
- PM Suraksha Bima Yojana
- National Pension System
- Public Provident Fund
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

# Government scheme URLs
SCHEME_URLS = {
    'pm_mudra_loan': 'https://www.india.gov.in/spotlight/pradhan-mantri-mudra-yojana',
    'sukanya_samriddhi': 'https://www.india.gov.in/spotlight/sukanya-samriddhi-yojana',
    'atal_pension_yojana': 'https://www.india.gov.in/spotlight/atal-pension-yojana',
    'pm_jeevan_jyoti': 'https://www.india.gov.in/spotlight/pradhan-mantri-jeevan-jyoti-bima-yojana',
    'pm_suraksha_bima': 'https://www.india.gov.in/spotlight/pradhan-mantri-suraksha-bima-yojana',
    'national_pension_system': 'https://www.india.gov.in/spotlight/national-pension-system',
    'public_provident_fund': 'https://www.india.gov.in/spotlight/public-provident-fund',
    'pm_jan_dhan_yojana': 'https://www.india.gov.in/spotlight/pradhan-mantri-jan-dhan-yojana',
}

# Alternative government scheme URLs
SCHEME_ALTERNATIVE_URLS = {
    'mygov_schemes': 'https://www.mygov.in/schemes/',
    'nps_information': 'https://www.nps.gov.in/',
    'ppf_information': 'https://www.indiapost.gov.in/financial-services/pages/content/public-provident-fund',
}


class GovernmentSchemeScraper:
    """Scraper for Government Schemes content."""
    
    def __init__(self, output_dir: str = 'ml/rag/knowledge_base/government_schemes'):
        """
        Initialize Government Scheme scraper.
        
        Args:
            output_dir: Directory to save scraped content
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.stats = ScrapingStats()
        logger.info(f"Government Scheme Scraper initialized. Output: {self.output_dir}")
    
    def scrape_url(self, url: str, category: str = 'general') -> bool:
        """
        Scrape a single government scheme URL.
        
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
            title = f"Government Scheme - {category.replace('_', ' ').title()}"
        
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
        Scrape all government scheme URLs.
        
        Args:
            include_alternatives: Whether to include alternative URLs
            
        Returns:
            Scraping statistics
        """
        urls_to_scrape = SCHEME_URLS.copy()
        
        if include_alternatives:
            urls_to_scrape.update(SCHEME_ALTERNATIVE_URLS)
        
        logger.info(f"Starting Government Scheme scraping. Total URLs: {len(urls_to_scrape)}")
        
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
        if category not in SCHEME_URLS:
            logger.error(f"Unknown category: {category}")
            return False
        
        url = SCHEME_URLS[category]
        return self.scrape_url(url, category)
    
    def get_stats(self) -> Dict:
        """Get scraping statistics."""
        return self.stats.get_summary()
    
    def print_summary(self):
        """Print scraping summary."""
        self.stats.print_summary()


def main():
    """Main function to run Government Scheme scraper."""
    import sys
    
    # Initialize scraper
    scraper = GovernmentSchemeScraper()
    
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
        logger.info("Scraping all Government Scheme content")
        scraper.scrape_all(include_alternatives=True)
    
    # Print summary
    scraper.print_summary()


if __name__ == '__main__':
    main()
