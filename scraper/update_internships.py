#!/usr/bin/env python3
"""
Run all internship scrapers and upsert normalized results into PostgreSQL.
"""

import json
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


def scrape_all() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    all_items: list[dict[str, Any]] = []
    source_results: list[dict[str, Any]] = []
    for scraper in ENABLED_SCRAPERS:
        try:
            scraped_items = scraper.scrape()
            if not isinstance(scraped_items, list) or any(
                not isinstance(item, dict) for item in scraped_items
            ):
                raise TypeError("scraper must return a list of internship records")

            all_items.extend(scraped_items)
            status = "ok" if scraped_items else "empty"
            source_results.append(
                {
                    "source": scraper.site_name,
                    "status": status,
                    "count": len(scraped_items),
                }
            )
            print(f"{scraper.site_name}: {status} ({len(scraped_items)} internships)")
        except Exception as exc:
            source_results.append(
                {
                    "source": scraper.site_name,
                    "status": "failed",
                    "count": 0,
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )
            print(f"{scraper.site_name}: failed: {type(exc).__name__}: {exc}")
    return all_items, source_results


def report_run(
    status: str,
    source_results: list[dict[str, Any]],
    *,
    scraped: int,
    upserted: int = 0,
    skipped: int = 0,
    indexed: int = 0,
    message: str | None = None,
) -> None:
    report = {
        "event": "interniq_scrape_summary",
        "status": status,
        "sources": source_results,
        "scraped": scraped,
        "upserted": upserted,
        "skipped": skipped,
        "indexed_chunks": indexed,
    }
    if message:
        report["message"] = message
    print(json.dumps(report, sort_keys=True))


def update_internship_data() -> bool:
    print("InternIQ PostgreSQL internship updater")
    print("=" * 50)

    scraped_items, source_results = scrape_all()
    incomplete_sources = [
        item["source"]
        for item in source_results
        if item["status"] in {"empty", "failed"}
    ]
    if not scraped_items:
        message = "No internships were scraped. Nothing to upsert."
        print(message)
        report_run("failed", source_results, scraped=0, message=message)
        return False

    with get_db_connection() as conn:
        summary = upsert_internships(conn, scraped_items)
        if summary["upserted"] == 0:
            message = "Every scraped record was invalid. Nothing was indexed."
            print(message)
            report_run(
                "failed",
                source_results,
                scraped=len(scraped_items),
                skipped=summary["skipped"],
                message=message,
            )
            return False
        indexed = reindex_rag(conn)

    print(f"Upserted internships: {summary['upserted']}")
    print(f"Skipped invalid records: {summary['skipped']}")
    print(f"Indexed internship chunks: {indexed['internships']}")
    print(f"Indexed career guidance documents: {indexed['career_guidance']}")
    report_run(
        "partial" if incomplete_sources else "ok",
        source_results,
        scraped=len(scraped_items),
        upserted=summary["upserted"],
        skipped=summary["skipped"],
        indexed=indexed["internships"],
    )
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
