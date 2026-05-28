"""
run_all_scrapers.py - Master orchestrator for all financial knowledge scrapers

This script runs all scrapers in sequence and generates a comprehensive report.

Usage:
    python run_all_scrapers.py              # Run all scrapers
    python run_all_scrapers.py rbi          # Run only RBI scraper
    python run_all_scrapers.py tax          # Run only Tax scraper
    python run_all_scrapers.py schemes      # Run only Government Schemes scraper
    python run_all_scrapers.py investment   # Run only Investment scraper
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Import all scrapers
from rbi_scraper import RBIScraper
from tax_scraper import TaxScraper
from govt_scheme_scraper import GovernmentSchemeScraper
from investment_scraper import InvestmentScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ScraperOrchestrator:
    """Master orchestrator for all financial knowledge scrapers."""
    
    def __init__(self):
        """Initialize the orchestrator."""
        self.scrapers = {
            'rbi': RBIScraper(),
            'tax': TaxScraper(),
            'schemes': GovernmentSchemeScraper(),
            'investment': InvestmentScraper(),
        }
        self.results = {}
        self.start_time = datetime.now()
    
    def run_scraper(self, scraper_name: str, include_alternatives: bool = True) -> bool:
        """
        Run a specific scraper.
        
        Args:
            scraper_name: Name of the scraper to run
            include_alternatives: Whether to include alternative URLs
            
        Returns:
            True if successful
        """
        if scraper_name not in self.scrapers:
            logger.error(f"Unknown scraper: {scraper_name}")
            return False
        
        logger.info(f"\n{'='*80}")
        logger.info(f"Starting {scraper_name.upper()} Scraper")
        logger.info(f"{'='*80}\n")
        
        try:
            scraper = self.scrapers[scraper_name]
            stats = scraper.scrape_all(include_alternatives=include_alternatives)
            self.results[scraper_name] = stats
            scraper.print_summary()
            return True
        except Exception as e:
            logger.error(f"Error running {scraper_name} scraper: {str(e)}")
            return False
    
    def run_all(self, include_alternatives: bool = True) -> Dict:
        """
        Run all scrapers.
        
        Args:
            include_alternatives: Whether to include alternative URLs
            
        Returns:
            Combined results from all scrapers
        """
        logger.info("\n" + "="*80)
        logger.info("STARTING COMPREHENSIVE FINANCIAL KNOWLEDGE SCRAPING")
        logger.info("="*80 + "\n")
        
        for scraper_name in self.scrapers.keys():
            self.run_scraper(scraper_name, include_alternatives)
        
        return self.results
    
    def print_comprehensive_report(self):
        """Print comprehensive scraping report."""
        duration = (datetime.now() - self.start_time).total_seconds()
        
        print("\n" + "="*80)
        print("COMPREHENSIVE SCRAPING REPORT")
        print("="*80 + "\n")
        
        total_urls = 0
        total_successful = 0
        total_failed = 0
        total_empty = 0
        total_saved = 0
        
        for scraper_name, stats in self.results.items():
            print(f"\n{scraper_name.upper()} SCRAPER:")
            print(f"  Total URLs: {stats['total_urls']}")
            print(f"  Successful: {stats['successful']}")
            print(f"  Failed: {stats['failed']}")
            print(f"  Empty: {stats['empty']}")
            print(f"  Saved: {stats['saved']}")
            print(f"  Success Rate: {stats['success_rate']}")
            print(f"  Duration: {stats['duration_seconds']:.1f}s")
            
            total_urls += stats['total_urls']
            total_successful += stats['successful']
            total_failed += stats['failed']
            total_empty += stats['empty']
            total_saved += stats['saved']
        
        print("\n" + "-"*80)
        print("OVERALL STATISTICS:")
        print("-"*80)
        print(f"Total URLs processed: {total_urls}")
        print(f"Total successful: {total_successful}")
        print(f"Total failed: {total_failed}")
        print(f"Total empty: {total_empty}")
        print(f"Total documents saved: {total_saved}")
        print(f"Overall success rate: {(total_successful / total_urls * 100):.1f}%" if total_urls > 0 else "0%")
        print(f"Total duration: {duration:.1f} seconds")
        print("="*80 + "\n")
        
        # Print knowledge base location
        print("KNOWLEDGE BASE LOCATION:")
        print("-"*80)
        kb_path = Path("ml/rag/knowledge_base")
        if kb_path.exists():
            for category_dir in kb_path.iterdir():
                if category_dir.is_dir():
                    file_count = len(list(category_dir.glob("**/*.txt")))
                    print(f"  {category_dir.name}: {file_count} documents")
        print("="*80 + "\n")
    
    def save_report(self, filename: str = "scraping_report.txt"):
        """
        Save comprehensive report to file.
        
        Args:
            filename: Output filename
        """
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("="*80 + "\n")
                f.write("COMPREHENSIVE SCRAPING REPORT\n")
                f.write("="*80 + "\n\n")
                f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                
                total_urls = 0
                total_successful = 0
                total_failed = 0
                total_empty = 0
                total_saved = 0
                
                for scraper_name, stats in self.results.items():
                    f.write(f"\n{scraper_name.upper()} SCRAPER:\n")
                    f.write(f"  Total URLs: {stats['total_urls']}\n")
                    f.write(f"  Successful: {stats['successful']}\n")
                    f.write(f"  Failed: {stats['failed']}\n")
                    f.write(f"  Empty: {stats['empty']}\n")
                    f.write(f"  Saved: {stats['saved']}\n")
                    f.write(f"  Success Rate: {stats['success_rate']}\n")
                    f.write(f"  Duration: {stats['duration_seconds']:.1f}s\n")
                    
                    total_urls += stats['total_urls']
                    total_successful += stats['successful']
                    total_failed += stats['failed']
                    total_empty += stats['empty']
                    total_saved += stats['saved']
                
                f.write("\n" + "-"*80 + "\n")
                f.write("OVERALL STATISTICS:\n")
                f.write("-"*80 + "\n")
                f.write(f"Total URLs processed: {total_urls}\n")
                f.write(f"Total successful: {total_successful}\n")
                f.write(f"Total failed: {total_failed}\n")
                f.write(f"Total empty: {total_empty}\n")
                f.write(f"Total documents saved: {total_saved}\n")
                f.write(f"Overall success rate: {(total_successful / total_urls * 100):.1f}%\n" if total_urls > 0 else "0%\n")
                f.write("="*80 + "\n")
            
            logger.info(f"Report saved to: {filename}")
        except Exception as e:
            logger.error(f"Error saving report: {str(e)}")


def main():
    """Main function."""
    orchestrator = ScraperOrchestrator()
    
    # Check command line arguments
    if len(sys.argv) > 1:
        scraper_name = sys.argv[1].lower()
        
        if scraper_name in orchestrator.scrapers:
            orchestrator.run_scraper(scraper_name, include_alternatives=True)
        else:
            print(f"Unknown scraper: {scraper_name}")
            print(f"Available scrapers: {', '.join(orchestrator.scrapers.keys())}")
            sys.exit(1)
    else:
        # Run all scrapers
        orchestrator.run_all(include_alternatives=True)
    
    # Print comprehensive report
    orchestrator.print_comprehensive_report()
    
    # Save report to file
    orchestrator.save_report("scraping_report.txt")


if __name__ == '__main__':
    main()
