import requests
from bs4 import BeautifulSoup
import json
import time
import random
from datetime import datetime
import os
from urllib.parse import urljoin, urlparse

def get_headers():
    """Return headers to mimic a real browser request."""
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

def scrape_internshala(max_pages=3, delay=2):
    """
    Scrape internship data from Internshala.
    
    Args:
        max_pages (int): Maximum number of pages to scrape
        delay (int): Delay between requests in seconds
    
    Returns:
        list: List of internship dictionaries
    """
    base_url = "https://internshala.com/internships"
    all_internships = []
    internship_id = 1  # Initialize ID counter
    
    print(f"Starting to scrape Internshala... (Max pages: {max_pages})")
    
    for page in range(1, max_pages + 1):
        try:
            # Construct URL for current page
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}/page-{page}"
            
            print(f"Scraping page {page}: {url}")
            
            # Make request
            response = requests.get(url, headers=get_headers(), timeout=10)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find internship cards
            internship_cards = soup.find_all('div', class_='individual_internship')
            
            if not internship_cards:
                print(f"No internship cards found on page {page}")
                break
            
            print(f"Found {len(internship_cards)} internships on page {page}")
            
            # Extract data from each card
            for card in internship_cards:
                try:
                    internship_data = extract_internship_data(card, base_url, internship_id)
                    if internship_data:
                        all_internships.append(internship_data)
                        internship_id += 1  # Increment ID for next internship
                except Exception as e:
                    print(f"Error extracting data from card: {e}")
                    continue
            
            # Add delay between requests
            if page < max_pages:
                print(f"Waiting {delay} seconds before next request...")
                time.sleep(delay + random.uniform(0.5, 1.5))
                
        except requests.RequestException as e:
            print(f"Error fetching page {page}: {e}")
            continue
        except Exception as e:
            print(f"Unexpected error on page {page}: {e}")
            continue
    
    print(f"Scraping completed! Total internships found: {len(all_internships)}")
    return all_internships

def extract_internship_data(card, base_url, internship_id):
    """
    Extract internship data from a single card.
    
    Args:
        card: BeautifulSoup element representing an internship card
        base_url (str): Base URL for constructing full links
        internship_id (int): Unique ID for this internship
    
    Returns:
        dict: Internship data dictionary
    """
    try:
        # Basic information - try multiple selectors for title
        title = "N/A"
        title_selectors = [
            'h3.heading_4_5',
            '.heading_4_5',
            'h3',
            '.internship_title',
            'a[href*="/internship/"]'
        ]
        
        for selector in title_selectors:
            title_elem = card.select_one(selector)
            if title_elem:
                title = title_elem.get_text(strip=True)
                if title and title != "N/A":
                    break
        
        # Company name - try multiple selectors
        company = "N/A"
        company_selectors = [
            'a.company_name',
            '.company_name',
            '.company',
            '[class*="company"]'
        ]
        
        for selector in company_selectors:
            company_elem = card.select_one(selector)
            if company_elem:
                company = company_elem.get_text(strip=True)
                if company and company != "N/A":
                    # Clean up company name
                    company = company.replace("Actively hiring", "").strip()
                    break
        
        # Location
        location = "Remote"
        location_selectors = [
            'a.location_link',
            '.location_link',
            '.location',
            '[class*="location"]'
        ]
        
        for selector in location_selectors:
            location_elem = card.select_one(selector)
            if location_elem:
                location = location_elem.get_text(strip=True)
                if location and location != "N/A":
                    break
        
        # Stipend information
        stipend = "Not specified"
        stipend_selectors = [
            'span.stipend',
            '.stipend',
            '[class*="stipend"]',
            '[class*="salary"]'
        ]
        
        for selector in stipend_selectors:
            stipend_elem = card.select_one(selector)
            if stipend_elem:
                stipend = stipend_elem.get_text(strip=True)
                if stipend and stipend != "Not specified":
                    break
        
        # Duration - try to extract clean duration
        duration = "Not specified"
        duration_selectors = [
            'div.duration',
            '.duration',
            '[class*="duration"]',
            'span[class*="duration"]',
            'div[class*="internship"] span'
        ]
        
        for selector in duration_selectors:
            duration_elem = card.select_one(selector)
            if duration_elem:
                duration_text = duration_elem.get_text(strip=True)
                # Try to extract just the duration part
                if "Months" in duration_text or "Month" in duration_text:
                    parts = duration_text.split()
                    for i, part in enumerate(parts):
                        if part.isdigit() and i + 1 < len(parts) and ("Month" in parts[i + 1] or "Months" in parts[i + 1]):
                            duration = f"{part} {parts[i + 1]}"
                            break
                elif "Weeks" in duration_text or "Week" in duration_text:
                    parts = duration_text.split()
                    for i, part in enumerate(parts):
                        if part.isdigit() and i + 1 < len(parts) and ("Week" in parts[i + 1] or "Weeks" in parts[i + 1]):
                            duration = f"{part} {parts[i + 1]}"
                            break
                elif duration_text and len(duration_text) < 50:  # Avoid very long text
                    duration = duration_text
                break
        
        # Posted date
        posted_date = "Not specified"
        posted_selectors = [
            'div.posted_date',
            '.posted_date',
            '[class*="posted"]'
        ]
        
        for selector in posted_selectors:
            posted_elem = card.select_one(selector)
            if posted_elem:
                posted_date = posted_elem.get_text(strip=True)
                if posted_date and posted_date != "Not specified":
                    break
        
        # Apply link
        apply_link = ""
        apply_selectors = [
            'a.view_detail_button',
            '.view_detail_button',
            'a[href*="/internship/"]',
            'a[class*="apply"]',
            'a[class*="button"]'
        ]
        
        for selector in apply_selectors:
            apply_link_elem = card.select_one(selector)
            if apply_link_elem and apply_link_elem.get('href'):
                apply_link = urljoin(base_url, apply_link_elem['href'])
                break
        
        # Skills/requirements
        skills = []
        skills_selectors = [
            'div.skill_tags',
            '.skill_tags',
            '[class*="skill"]',
            '[class*="tag"]'
        ]
        
        for selector in skills_selectors:
            skills_elem = card.select_one(selector)
            if skills_elem:
                skill_tags = skills_elem.find_all(['span', 'div'], class_=lambda x: x and ('skill' in x.lower() or 'tag' in x.lower()))
                if skill_tags:
                    skills = [tag.get_text(strip=True) for tag in skill_tags if tag.get_text(strip=True)]
                    break
        
        # Internship type (remote/on-site)
        is_remote = False
        remote_selectors = [
            'span.remote_work',
            '.remote_work',
            '[class*="remote"]'
        ]
        
        for selector in remote_selectors:
            remote_elem = card.select_one(selector)
            if remote_elem:
                is_remote = True
                break
        
        # Also check if location contains "Remote"
        if "remote" in location.lower():
            is_remote = True
        
        # Determine domain based on title and skills
        domain = determine_domain(title, skills)
        
        # Determine difficulty based on company and requirements
        difficulty = determine_difficulty(company, skills, stipend)
        
        # Create internship data dictionary
        internship_data = {
            "id": internship_id,
            "title": title,
            "company": company,
            "location": location,
            "domain": domain,
            "duration": duration,
            "stipend": stipend,
            "requirements": skills,
            "description": f"Internship at {company} - {title}",
            "posted_date": posted_date,
            "deadline": "2024-04-30",  # Default deadline
            "remote": is_remote,
            "paid": "unpaid" not in stipend.lower() and "not specified" not in stipend.lower(),
            "difficulty": difficulty,
            "apply_link": apply_link,
            "source": "Internshala"
        }
        
        return internship_data
        
    except Exception as e:
        print(f"Error extracting data from card: {e}")
        return None

def determine_domain(title, skills):
    """Determine the domain based on title and skills."""
    title_lower = title.lower()
    skills_lower = [skill.lower() for skill in skills]
    
    # Domain mapping with more specific keywords
    domain_keywords = {
        "Software Development": ["software", "developer", "programming", "coding", "java", "python", "javascript", "c++", "c#", "php", "ruby", "go", "rust"],
        "Web Development": ["web", "frontend", "backend", "full stack", "react", "angular", "vue", "html", "css", "node.js", "express", "django", "flask"],
        "Data Science": ["data", "analytics", "data science", "statistics", "python", "r", "sql", "excel", "tableau", "power bi"],
        "Machine Learning": ["machine learning", "ai", "artificial intelligence", "deep learning", "tensorflow", "pytorch", "neural networks", "nlp"],
        "UI/UX Design": ["ui", "ux", "design", "figma", "adobe", "photoshop", "illustrator", "sketch", "prototyping", "wireframing"],
        "Graphic Design": ["graphic design", "illustration", "logo", "branding", "adobe", "photoshop", "illustrator", "canva"],
        "Digital Marketing": ["marketing", "digital marketing", "social media", "seo", "sem", "google ads", "facebook ads", "content marketing"],
        "Content Writing": ["content", "writing", "copywriting", "blog", "article", "creative writing", "editing"],
        "Sales": ["sales", "business development", "lead generation", "customer acquisition", "b2b", "b2c"],
        "Operations": ["operations", "logistics", "supply chain", "process improvement", "project management"],
        "Cybersecurity": ["security", "cybersecurity", "network", "penetration", "ethical hacking", "information security"],
        "Cloud Computing": ["cloud", "aws", "azure", "google cloud", "devops", "docker", "kubernetes"],
        "DevOps": ["devops", "ci/cd", "jenkins", "docker", "kubernetes", "aws", "azure", "infrastructure"],
        "Video Production": ["video", "videography", "editing", "premiere", "after effects", "cinematography", "filmmaking"],
        "Photography": ["photography", "camera", "lightroom", "photoshop", "portrait", "event photography"]
    }
    
    for domain, keywords in domain_keywords.items():
        if any(keyword in title_lower for keyword in keywords) or any(keyword in skills_lower for keyword in keywords):
            return domain
    
    return "Other"

def determine_difficulty(company, skills, stipend):
    """Determine difficulty level based on company, skills, and stipend."""
    # Top tier companies
    top_companies = ["google", "microsoft", "amazon", "apple", "meta", "netflix", "openai", "uber", "airbnb"]
    
    if any(company.lower() in top_company for top_company in top_companies):
        return "Hard"
    
    # Check for advanced skills
    advanced_skills = ["machine learning", "ai", "deep learning", "cybersecurity", "devops", "cloud"]
    if any(skill.lower() in advanced_skill for skill in skills for advanced_skill in advanced_skills):
        return "Hard"
    
    # Check stipend (higher stipend might indicate harder positions)
    if "5000" in stipend or "6000" in stipend or "7000" in stipend or "8000" in stipend:
        return "Medium"
    
    return "Easy"

def save_to_json(data, filename="data/internships.json"):
    """Save scraped data to JSON file."""
    try:
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Data saved to {filename}")
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

def load_from_json(filename="data/internships.json"):
    """Load data from JSON file."""
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading data: {e}")
        return []

def main():
    """Main function to run the scraper."""
    print("🚀 Internshala Scraper")
    print("=" * 50)
    
    # Scrape data
    internships = scrape_internshala(max_pages=2, delay=3)
    
    if internships:
        # Save to JSON
        save_to_json(internships)
        
        # Display sample data
        print("\n📋 Sample Internships:")
        print("-" * 50)
        for i, internship in enumerate(internships[:5], 1):
            print(f"{i}. {internship['title']} at {internship['company']}")
            print(f"   Location: {internship['location']}")
            print(f"   Domain: {internship['domain']}")
            print(f"   Stipend: {internship['stipend']}")
            print(f"   Difficulty: {internship['difficulty']}")
            print(f"   Remote: {'Yes' if internship['remote'] else 'No'}")
            print()
        
        print(f"✅ Successfully scraped {len(internships)} internships!")
    else:
        print("❌ No internships found or scraping failed.")

if __name__ == "__main__":
    main()
