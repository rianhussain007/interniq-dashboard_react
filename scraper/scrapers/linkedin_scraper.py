from .base_scraper import BaseScraper
from typing import List, Dict, Any
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from .selenium_utils import create_chrome_driver

class LinkedInScraper(BaseScraper):
    def __init__(self):
        super().__init__("LinkedIn")
        self.base_url = "https://www.linkedin.com/jobs/search/?keywords=intern&location=Bengaluru%2C%20Karnataka%2C%20India&f_TPR=r86400"

    def scrape(self, max_pages: int = 1) -> List[Dict[str, Any]]:
        print(f"Scraping {self.site_name} for internships in Bangalore...")
        
        # --- Selenium Setup ---
        try:
            driver = create_chrome_driver()
        except Exception as e:
            print(f"Error starting Selenium WebDriver: {e}")
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
