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

The FastAPI backend exposes the same update flow:

```bash
curl -X POST http://127.0.0.1:8000/api/internships/update
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

In production, the scraper should run as a Cloud Run Job triggered by Cloud Scheduler. Secrets and database credentials should come from Secret Manager and Cloud Run environment variables. Set `GEMINI_API_KEY` for indexing and `GROQ_API_KEY` for structured mentor responses.

## Notes

Scraping can be affected by source website changes, rate limits, or blocking. Keep requests respectful, add source-specific error handling, and prefer official APIs when available.
