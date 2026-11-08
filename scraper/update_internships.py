#!/usr/bin/env python3
"""
Run all internship scrapers and upsert normalized results into PostgreSQL.
"""

import os
import sys
from typing import Any

from dotenv import load_dotenv

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.append(PROJECT_ROOT)
sys.path.append(BACKEND_DIR)

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from db import get_db_connection
from internships_store import upsert_internships
from rag_store import reindex_rag
from scraper.scrapers.internshala_scraper import InternshalaScraper
from scraper.scrapers.linkedin_scraper import LinkedInScraper
from scraper.scrapers.naukri_scraper import NaukriScraper


ENABLED_SCRAPERS = [
    InternshalaScraper(),
    LinkedInScraper(),
    NaukriScraper(),
]


def scrape_all() -> list[dict[str, Any]]:
    all_items: list[dict[str, Any]] = []
    for scraper in ENABLED_SCRAPERS:
        try:
            scraped_items = scraper.scrape()
            all_items.extend(scraped_items)
            print(f"{scraper.site_name}: scraped {len(scraped_items)} internships.")
        except Exception as exc:
            print(f"{scraper.site_name}: scraper failed: {exc}")
    return all_items


def update_internship_data() -> bool:
    print("InternIQ PostgreSQL internship updater")
    print("=" * 50)

    scraped_items = scrape_all()
    if not scraped_items:
        print("No internships were scraped. Nothing to upsert.")
        return False

    with get_db_connection() as conn:
        summary = upsert_internships(conn, scraped_items)
        indexed = reindex_rag(conn)

    print(f"Upserted internships: {summary['upserted']}")
    print(f"Skipped invalid records: {summary['skipped']}")
    print(f"Indexed internship chunks: {indexed['internships']}")
    print(f"Indexed career guidance documents: {indexed['career_guidance']}")
    return True


def main() -> None:
    try:
        success = update_internship_data()
    except RuntimeError as exc:
        print(f"Configuration error: {exc}")
        print("Set DATABASE_URL and initialize the schema with: python backend/init_db.py")
        raise SystemExit(2) from exc
    except Exception as exc:
        print(f"Update failed: {exc}")
        raise SystemExit(1) from exc

    raise SystemExit(0 if success else 1)


if __name__ == "__main__":
    main()
