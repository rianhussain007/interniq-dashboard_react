from abc import ABC, abstractmethod
from typing import List, Dict, Any
import requests

class BaseScraper(ABC):
    """
    Abstract base class for all internship scrapers.
    Each scraper should implement the methods defined here.
    """

    def __init__(self, site_name: str):
        self.site_name = site_name

    @abstractmethod
    def scrape(self, max_pages: int = 1) -> List[Dict[str, Any]]:
        """
        The main method to run the scraper.
        It should orchestrate the process of fetching pages and parsing them.
        """
        pass

    def _fetch_page(self, url: str) -> str:
        """
        A helper method to fetch the HTML content of a single page.
        Can be overridden if a site requires special handling.
        """
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return ""

    def get_site_name(self) -> str:
        """Returns the name of the site being scraped."""
        return self.site_name
