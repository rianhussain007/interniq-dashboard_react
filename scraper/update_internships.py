#!/usr/bin/env python3
"""
Script to update internship data by running all available scrapers
and integrating the results with the InternIQ dashboard.
"""

import os
import sys
import json
from datetime import datetime

# Add the project root to the path so we can import the scraper modules
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Import scraper classes
from scraper.scrapers.internshala_scraper import InternshalaScraper
from scraper.scrapers.linkedin_scraper import LinkedInScraper
from scraper.scrapers.naukri_scraper import NaukriScraper

# --- Configuration ---
DATA_FILE = os.path.join(project_root, 'data', 'internships.json')
BACKUP_DIR = os.path.join(project_root, 'data')

# List of scrapers to run
ENABLED_SCRAPERS = [
    InternshalaScraper(),
    LinkedInScraper(),
    NaukriScraper(),
]

def load_from_json(filepath=DATA_FILE):
    """Loads data from a JSON file."""
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading {filepath}: {e}")
        return []

def save_to_json(data, filepath=DATA_FILE):
    """Saves data to a JSON file."""
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return True
    except IOError as e:
        print(f"Error saving to {filepath}: {e}")
        return False

def update_internship_data():
    """Update internship data by running all scrapers and merging with existing data."""
    print("🔄 Updating Internship Data")
    print("=" * 50)

    # 1. Load existing data
    existing_data = load_from_json()
    print(f"📊 Found {len(existing_data)} existing internships.")

    # 2. Scrape new data from all enabled sources
    all_new_data = []
    for scraper in ENABLED_SCRAPERS:
        try:
            scraped_data = scraper.scrape()
            all_new_data.extend(scraped_data)
        except Exception as e:
            print(f"❌ Error running {scraper.site_name} scraper: {e}")

    if not all_new_data:
        print("\n❌ No new data was scraped from any source. Aborting update.")
        return False

    print(f"\n✅ Scraped a total of {len(all_new_data)} internships from {len(ENABLED_SCRAPERS)} sources.")

    # 3. Merge data (avoid duplicates based on a unique key)
    merged_data = existing_data.copy()
    existing_keys = {f"{item.get('title', '')}_{item.get('company', '')}_{item.get('source', '')}" for item in existing_data}

    new_count = 0
    for item in all_new_data:
        key = f"{item.get('title', '')}_{item.get('company', '')}_{item.get('source', '')}"
        if key not in existing_keys:
            item['id'] = len(merged_data) + 1 # Assign a new, simple integer ID
            merged_data.append(item)
            existing_keys.add(key)
            new_count += 1

    print(f"📈 Added {new_count} new unique internships.")
    print(f"📊 Total internships now: {len(merged_data)}")

    # 4. Save merged data and create a backup
    if new_count > 0:
        print("\n💾 Saving updated data...")
        # Create a backup before overwriting
        backup_filename = os.path.join(BACKUP_DIR, f"internships_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        if save_to_json(existing_data, backup_filename):
            print(f"📦 Backup of old data created: {os.path.basename(backup_filename)}")
        else:
            print("⚠️ Could not create a backup.")

        # Save the new merged data
        if save_to_json(merged_data):
            print("✅ Data successfully saved!")
            return True
        else:
            print("❌ Failed to save updated data.")
            return False
    else:
        print("\n✨ No new internships to add. Data is already up-to-date.")
        return True

def main():
    """Main entry point for the script."""
    print("🚀 InternIQ - Modular Internship Data Updater")
    print("=" * 50)
    success = update_internship_data()
    print("-" * 50)
    if success:
        print("\n✅ Update process completed successfully!")
    else:
        print("\n❌ Update process failed. Please check the error messages above.")

if __name__ == "__main__":
    main()