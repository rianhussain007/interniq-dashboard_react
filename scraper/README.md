# InternIQ Scraper Pipeline

This folder contains the Python scraping pipeline used by InternIQ to collect internship listings and normalize them for the dashboard.

## Current Behavior

The scraper writes directly to PostgreSQL through `DATABASE_URL`. Initialize the database schema first:

```bash
cd backend
python init_db.py
cd ..
```

Run the scraper from the project root:

```bash
python scraper/update_internships.py
```

After the scraper upserts postings, it automatically chunks and indexes internship and career-guidance content with LangChain and Gemini embeddings. `/api/rag/reindex` remains available for an explicit full reindex after changing embedding models or chunk settings.

Each source reports `ok`, `empty`, or `failed`. The job emits a structured JSON event (`event: interniq_scrape_summary`) with per-source counts and database/index totals for Cloud Run Logs. A run with some successful sources and some empty or failed sources is marked `partial`; a run with no usable records exits non-zero so it is not mistaken for a refresh.

Listing upserts commit before vector reindexing starts. If Gemini or pgvector indexing fails, the listings remain available to keyword search, the run reports `index_failed`, and the job exits non-zero for retry.

Internships are visible in search and mentor recommendations only while the source has been seen within the last 30 days and any listed deadline has not passed. The schema migration backfills `last_seen_at`; each successful upsert refreshes it. Reindexing removes expired internship chunks from pgvector, and retrieval filters them immediately even before the next reindex.

The FastAPI backend exposes the same update flow and requires `INTERNIQ_ADMIN_TOKEN`:

```bash
curl -X POST http://127.0.0.1:8000/api/internships/update -H "X-InternIQ-Admin-Token: <INTERNIQ_ADMIN_TOKEN>"
```

## Internship Schema

Scraped records are normalized into:

- `title`
- `company`
- `location`
- `mode`
- `stipend`
- `skills`
- `source`
- `apply_link`
- `posted_date`
- `deadline`

Deduplication uses `apply_link` when available, with `title + company + source` as the fallback composite identity.

## GCP Automation Target

In production, the scraper should run as a Cloud Run Job triggered by Cloud Scheduler. Secrets and database credentials should come from Secret Manager and Cloud Run environment variables. Set `GEMINI_API_KEY` for indexing, `GROQ_API_KEY` for structured mentor responses, and `INTERNIQ_ADMIN_TOKEN` for protected API-triggered jobs.

## Notes

Scraping can be affected by source website changes, rate limits, or blocking. Keep requests respectful, add source-specific error handling, and prefer official APIs when available.
