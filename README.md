# InternIQ Dashboard

InternIQ is a full-stack internship aggregation and AI career assistant platform for students. The current app includes a React dashboard, FastAPI backend, Python scraping pipeline, and a mentor assistant. The target production architecture is GCP: Firebase Hosting for the frontend, Cloud Run for FastAPI, Cloud SQL PostgreSQL with pgvector for data/RAG storage, Cloud Scheduler + Cloud Run Jobs for scraper automation, Secret Manager for credentials, and Cloud Logging/Error Reporting for operations.

## Current Features

- Internship aggregation from scraper/API sources.
- React, TypeScript, Vite, and Tailwind dashboard.
- FastAPI backend with CORS and environment-based configuration.
- Search and filtering for internships.
- On-demand internship update endpoint.
- Retrieval-augmented mentor using LangChain, Gemini embeddings, PostgreSQL/pgvector, and schema-validated Groq output.
- Scrape-to-search indexing: normalize postings, split them into overlapping chunks, embed only changed chunks, and update pgvector in the same database transaction.
- Mentor responses include grounded next steps, source references, and validated internship recommendations.

## Build Roadmap

1. [x] Fix integration paths across React, FastAPI, scraper, and docs.
2. [x] Store normalized internship records in PostgreSQL.
3. [x] Save internships and track applications.
4. [x] Add LangChain chunking, Gemini embeddings, pgvector retrieval, and structured mentor output.
5. [x] Connect the mentor response and recommendations to the dashboard.
6. [ ] Dockerize and deploy the backend to Cloud Run.
7. [ ] Deploy the frontend to Firebase Hosting or Cloud Storage + Cloud CDN.
8. [ ] Schedule scraper jobs with Cloud Scheduler and Cloud Run Jobs.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Backend: Python, FastAPI, LangChain, Gemini embeddings, Groq chat, python-dotenv, BeautifulSoup, Selenium.
- Current data store: PostgreSQL.
- RAG vector store: PostgreSQL + pgvector.
- Planned deployment: GCP Cloud Run, Cloud SQL, Firebase Hosting, Cloud Scheduler, Secret Manager, Cloud Storage.

## Local Development

### Prerequisites

- Node.js 22 or later.
- Python 3.10 or later.
- pip.

### Environment

Copy the root environment example:

```bash
cp .env.example .env
```

For local development, these defaults are expected:

```env
VITE_API_BASE_URL="http://127.0.0.1:8000"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interniq"
DB_CONNECT_TIMEOUT_SECONDS="10"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
INTERNIQ_ADMIN_TOKEN="generate-a-long-random-token"
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="openai/gpt-oss-20b"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_EMBEDDING_MODEL="gemini-embedding-2-preview"
RAG_EMBEDDING_DIMENSIONS="768"
RAG_TOP_K="6"
RAG_CHUNK_SIZE="900"
RAG_CHUNK_OVERLAP="120"
```

The frontend only reads `VITE_*` variables. Backend-only secrets such as `GROQ_API_KEY` must not be exposed through `VITE_*` variables.

Email/password and Google sign-in use Supabase Auth. Enable the email provider and, if needed, Google in the Supabase dashboard. The Google client ID must match the configured Google provider. The backend uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` to verify bearer tokens; use the same project URL and public anon/publishable key as the frontend. Set `INTERNIQ_ADMIN_TOKEN` to a long random value for scraper and full-reindex endpoints.

### Backend

From the project root:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

Initialize the PostgreSQL schema before running internship routes:

```bash
python init_db.py
```

The scraper automatically refreshes the RAG index after upserting postings. To build or refresh it manually after changing the embedding model or chunk settings:

```bash
curl -X POST http://127.0.0.1:8000/api/rag/reindex -H "Content-Type: application/json" -H "X-InternIQ-Admin-Token: <INTERNIQ_ADMIN_TOKEN>" -d "{}"
```

### Scraper

The scraper writes normalized internship records directly into PostgreSQL:

```bash
python scraper/update_internships.py
```

The backend update endpoint runs the same scraper:

```bash
curl -X POST http://127.0.0.1:8000/api/internships/update -H "X-InternIQ-Admin-Token: <INTERNIQ_ADMIN_TOKEN>"
```

### Frontend

From the project root:

```bash
npm install
npm run dev
```

The app should be available at `http://localhost:5173` and call the backend through `VITE_API_BASE_URL`.

## API Routes

Current routes:

- `GET /api/health`
- `GET /api/internships`
- `GET /api/internships/search`
- `POST /api/internships/update`
- `GET /api/saved?user_id=...`
- `POST /api/saved`
- `GET /api/applications?user_id=...`
- `POST /api/applications`
- `POST /api/mentor-chat`
- `POST /api/rag/reindex`

Saved internships, applications, and mentor chat require a valid Supabase bearer token. The backend verifies the token with Supabase and binds private records to that verified user ID. Scraping and full reindex require the admin header.

## RAG Assistant

The mentor assistant and indexing job use a multi-step LangChain flow:

1. Scrapers normalize internship records and save them to PostgreSQL.
2. LangChain's recursive splitter creates 900-character chunks with 120-character overlap.
3. Gemini embeddings are generated for changed chunks and stored in PostgreSQL with pgvector.
4. A user question is embedded and pgvector retrieves the closest chunks, including user-scoped profile, saved roles, and application history.
5. LangChain's Groq integration returns a schema-validated answer, next steps, and recommendations restricted to retrieved internship IDs.

The database schema uses 768-dimensional vectors. If changing the embedding dimension, update `backend/schema.sql`, clear or migrate the derived knowledge index, then run the reindex endpoint.

Knowledge sources currently indexed:

- internship postings
- career guidance docs from `backend/data/mentor_memory.json`
- user profile passed from the React auth context
- saved internships
- application history

The default embedding model is `gemini-embedding-2-preview`, used through LangChain's text embedding interface. The model remains configurable; changing it causes existing chunks to be re-embedded on the next reindex.

## GCP Deployment Target

### Frontend

Use Firebase Hosting or Cloud Storage + Cloud CDN. Configure:

```env
VITE_API_BASE_URL="https://your-cloud-run-backend-url"
```

### Backend

Use Cloud Run with a containerized FastAPI service. Runtime configuration should come from Cloud Run environment variables and Secret Manager:

```env
ALLOWED_ORIGINS="https://your-firebase-project.web.app"
GROQ_API_KEY="secret-manager-value"
GROQ_MODEL="openai/gpt-oss-20b"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="secret-manager-value"
INTERNIQ_ADMIN_TOKEN="secret-manager-value"
```

```env
DATABASE_URL="postgresql://..."
```

### Database

Use Cloud SQL PostgreSQL with `pgvector` enabled.

### Scraper Automation

Use Cloud Scheduler to trigger a Cloud Run Job that runs the scraper on a fixed cadence. The pipeline writes normalized internship records to PostgreSQL, then chunks and indexes them in pgvector.

### Storage And Monitoring

- Store uploaded resumes and related files in Cloud Storage.
- Store secrets in Secret Manager.
- Use Cloud Logging and Error Reporting for backend and scraper observability.

## Notes

The local scrape → chunk → embed → retrieve → structured response workflow is implemented. Containerization, hosted deployment, and scheduled scraper operations remain next steps.

Supabase Auth provides the email/password and Google sessions. Private API routes verify the bearer token and enforce the authenticated user ID; database row-level security policies are restored when the schema runs on Supabase.
