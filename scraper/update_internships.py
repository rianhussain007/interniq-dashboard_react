#!/usr/bin/env python3
"""Refresh live internship postings from public job-board APIs."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from dotenv import load_dotenv

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, BACKEND_DIR)

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from db import get_db_connection, is_sqlite_backend
from internships_store import upsert_internships
from local_store import upsert_internship as upsert_local_internship
from rag_store import reindex_rag
from scraper.live_sources import scrape_all_public_sources


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
    report: dict[str, Any] = {
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
    backend = "SQLite" if is_sqlite_backend() else "PostgreSQL"
    print(f"InternIQ live internship refresh ({backend})")
    records, source_results = scrape_all_public_sources()
    if not records:
        successful_sources = [item for item in source_results if item["status"] in {"ok", "empty"}]
        failed_sources = [item for item in source_results if item["status"] == "failed"]
        status = "empty" if successful_sources and not failed_sources else "failed"
        message = "Sources responded, but no internship postings matched." if status == "empty" else "No configured source returned usable results."
        report_run(status, source_results, scraped=0, message=message)
        return status == "empty"

    skipped = 0
    if is_sqlite_backend():
        upserted = 0
        for record in records:
            try:
                upsert_local_internship(record)
                upserted += 1
            except (TypeError, ValueError):
                skipped += 1
        indexed = 0
    else:
        with get_db_connection() as conn:
            summary = upsert_internships(conn, records)
        upserted = summary["upserted"]
        skipped = summary["skipped"]
        indexed = 0
        if upserted:
            try:
                with get_db_connection() as conn:
                    indexed = reindex_rag(conn)["internships"]
            except Exception as exc:
                report_run(
                    "index_failed",
                    source_results,
                    scraped=len(records),
                    upserted=upserted,
                    skipped=skipped,
                    message=f"Listings were saved, but vector indexing failed: {type(exc).__name__}: {exc}",
                )
                return False

    source_errors = any(item["status"] == "failed" for item in source_results)
    report_run(
        "partial" if source_errors else "ok",
        source_results,
        scraped=len(records),
        upserted=upserted,
        skipped=skipped,
        indexed=indexed,
        message="Some sources were unavailable; successful source results were retained." if source_errors else None,
    )
    return upserted > 0


def main() -> None:
    try:
        success = update_internship_data()
    except RuntimeError as exc:
        print(f"Configuration error: {exc}")
        raise SystemExit(2) from exc
    except Exception as exc:
        print(f"Update failed: {type(exc).__name__}: {exc}")
        raise SystemExit(1) from exc
    raise SystemExit(0 if success else 1)


if __name__ == "__main__":
    main()
