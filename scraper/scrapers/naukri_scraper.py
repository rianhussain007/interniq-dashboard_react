from .base_scraper import BaseScraper
from typing import List, Dict, Any
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import os

class NaukriScraper(BaseScraper):
    def __init__(self):
        super().__init__("Naukri")
        self.base_url = "https://www.naukri.com/internship-jobs-in-bangalore"
        # Correct path to chromedriver assuming the script is run from the project root
        driver_path = os.path.join(os.getcwd(), 'drivers', 'chromedriver.exe')
        self.service = Service(executable_path=driver_path)

    def scrape(self, max_pages: int = 1) -> List[Dict[str, Any]]:
        print(f"Scraping {self.site_name} for internships in Bangalore...")
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument("log-level=3") # Suppress console logs
        options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36')

        driver = webdriver.Chrome(service=self.service, options=options)
        html_content = None
        try:
            driver.get(self.base_url)
            # Wait for the job container to be present
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CLASS_NAME, "list-jobs-container"))
            )
            html_content = driver.page_source
            print("Successfully loaded page with Selenium.")
        except Exception as e:
            print(f"Error loading page with Selenium: {e}")
        finally:
            driver.quit()

        all_internships = []
        if not html_content:
            print("Failed to fetch page content from Naukri.com.")
            return all_internships

        print("Successfully fetched page content. Now parsing...")
        soup = BeautifulSoup(html_content, 'html.parser')
        
        results_container = soup.find('div', class_='list-jobs-container')
        if not results_container:
            print("Could not find the main job container on the page.")
            return all_internships

        job_cards = results_container.find_all('article', class_='jobTuple')
        print(f"Found {len(job_cards)} job cards on the page.")

        for card in job_cards:
            try:
                title_element = card.find('a', class_='title')
                title = title_element.text.strip()
                apply_link = title_element['href']

                company_element = card.find('a', class_='subTitle')
                company = company_element.text.strip()

                location_element = card.find('span', class_='loc-text')
                location = location_element.text.strip()

                all_internships.append({
                    'id': f"naukri_{title}_{company}".replace(' ', '_'),
                    'title': title,
                    'company': company,
                    'location': location,
                    'start_date': 'N/A',
                    'duration': 'N/A',
                    'stipend': 'Not Disclosed',
                    'apply_link': apply_link,
                    'domain': title,
                    'source': self.site_name
                })
            except Exception as e:
                # print(f"Skipping a card due to parsing error: {e}")
                continue

        return all_internships
