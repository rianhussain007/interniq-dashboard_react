from .base_scraper import BaseScraper
from typing import List, Dict, Any
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

class LinkedInScraper(BaseScraper):
    def __init__(self):
        super().__init__("LinkedIn")
        self.base_url = "https://www.linkedin.com/jobs/search/?keywords=intern&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r86400"

    def scrape(self, max_pages: int = 1) -> List[Dict[str, Any]]:
        print(f"Scraping {self.site_name} for internships in Bangalore...")
        
        # Construct the absolute path to the chromedriver
        script_dir = os.path.dirname(os.path.abspath(__file__))  # scraper/scrapers
        project_root = os.path.dirname(os.path.dirname(script_dir))  # interniq-dashboard_react
        driver_path = os.path.join(project_root, 'drivers', 'chromedriver.exe')

        # --- Selenium Setup ---
        try:
            service = Service(executable_path=driver_path)
            options = webdriver.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            driver = webdriver.Chrome(service=service, options=options)
        except Exception as e:
            print(f"Error starting Selenium WebDriver. Please ensure '{driver_path}' is correct and accessible.")
            print(f"Error: {e}")
            return []

        all_internships = []
        try:
            driver.get(self.base_url)
            print(f"Navigated to: {self.base_url}")
            wait = WebDriverWait(driver, 20)

            # Scroll down to load more jobs
            print("Scrolling to load all jobs...")
            last_height = driver.execute_script("return document.body.scrollHeight")
            for _ in range(3): # Scroll a few times to load more jobs
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(3) # Wait for new jobs to load
                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height

            # Wait for the job listings to be present
            job_list_element = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'jobs-search__results-list')))
            job_cards = job_list_element.find_elements(By.TAG_NAME, 'li')
            print(f"Found {len(job_cards)} job cards on the page.")

            for card in job_cards:
                try:
                    title_element = card.find_element(By.CLASS_NAME, 'base-search-card__title')
                    title = title_element.text.strip()

                    company_element = card.find_element(By.CLASS_NAME, 'base-search-card__subtitle')
                    company = company_element.text.strip()

                    location_element = card.find_element(By.CLASS_NAME, 'job-search-card__location')
                    location = location_element.text.strip()

                    link_element = card.find_element(By.TAG_NAME, 'a')
                    apply_link = link_element.get_attribute('href')

                    all_internships.append({
                        'id': f"linkedin_{title}_{company}".replace(' ', '_'),
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
                except Exception as card_error:
                    # print(f"Could not parse a job card: {card_error}")
                    continue # Skip cards that don't have the right structure

        except Exception as e:
            print(f"An error occurred during scraping: {e}")
        finally:
            driver.quit()
            print("Browser closed.")

        return all_internships
