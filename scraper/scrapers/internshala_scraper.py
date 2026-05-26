from .base_scraper import BaseScraper
from typing import List, Dict, Any
import requests
from bs4 import BeautifulSoup
import time

class InternshalaScraper(BaseScraper):
    def __init__(self):
        super().__init__("Internshala")
        self.base_url = "https://internshala.com/internships/work-from-home-jobs"

    def scrape(self, max_pages: int = 2) -> List[Dict[str, Any]]:
        """Scrapes work-from-home internships from Internshala."""
        print(f"Starting to scrape {self.site_name} WFH jobs... (Max pages: {max_pages})")
        all_internships = []
        for page in range(1, max_pages + 1):
            url = f"{self.base_url}/page-{page}"
            print(f"Scraping page {page}: {url}")
            html_content = self._fetch_page(url)
            if not html_content:
                continue

            soup = BeautifulSoup(html_content, 'lxml')
            internship_cards = soup.find_all('div', class_='internship_meta')

            if not internship_cards:
                print(f"No internships found on page {page}. Stopping.")
                break

            print(f"Found {len(internship_cards)} internships on page {page}")
            for card in internship_cards:
                internship_data = self._parse_card(card)
                if internship_data:
                    all_internships.append(internship_data)
            
            if page < max_pages:
                time.sleep(2)  # Respectful delay

        print(f"Scraping finished. Total internships found: {len(all_internships)}")
        return all_internships

    def _parse_card(self, card) -> Dict[str, Any]:
        """Parses a single internship card to extract details based on the new HTML structure."""
        try:
            title_element = card.find('h3', class_='job-internship-name')
            title = title_element.text.strip() if title_element else 'N/A'

            company_element = card.find('div', class_='company_name')
            company = company_element.text.strip() if company_element else 'N/A'

            # Extracting details from the new structure
            location_element = card.find('div', class_='locations')
            location = location_element.text.strip() if location_element else 'Work From Home'

            stipend_element = card.find('span', class_='stipend')
            stipend = stipend_element.text.strip() if stipend_element else 'N/A'

            # Duration is less specific, find by icon
            duration_icon = card.find('i', class_='ic-16-calendar')
            duration = duration_icon.find_next_sibling('span').text.strip() if duration_icon and duration_icon.find_next_sibling('span') else 'N/A'

            # Start date is not available on the main card anymore
            start_date = 'N/A'
            
            link_element = card.find('a', id='job_title')
            apply_link = f"https://internshala.com{link_element['href']}" if link_element else '#'

            return {
                'id': f"internshala_{title}_{company}".replace(' ', '_'),
                'title': title,
                'company': company,
                'location': location,
                'start_date': start_date,
                'duration': duration,
                'stipend': stipend,
                'apply_link': apply_link,
                'domain': title, # Use title as domain for now
                'source': self.site_name
            }
        except Exception as e:
            print(f"Error parsing card: {e}")
            return None
