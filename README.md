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
6. [x] Containerize the backend and define repeatable Cloud Run service, scraper job, and scheduler deployment.
7. [ ] Deploy the backend and database to a configured GCP project.
8. [ ] Deploy the frontend to Firebase Hosting or Cloud Storage + Cloud CDN.

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

The migration grants application CRUD access to a PostgreSQL role named `interniq_app`. Create that role in the local database before initialization (use a unique password if you connect as the role):

```sql
CREATE ROLE interniq_app LOGIN PASSWORD 'replace-with-a-local-password';
```

Build and start the production container locally (the health route does not require provider or database credentials):

```bash
docker build -t interniq-api .
docker run --rm -p 8080:8080 interniq-api
```

Then check `http://localhost:8080/api/health`. The image includes Chromium and ChromeDriver so the same image can run the Selenium scrapers as a Cloud Run Job. On Windows, the scraper uses `drivers/chromedriver.exe` when present; elsewhere Selenium Manager can resolve a driver, or set `CHROME_BIN` and `CHROMEDRIVER_PATH` explicitly.

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
- `GET /api/dashboard/summary`
- `GET /api/checklist`
- `PUT /api/checklist`
- `POST /api/internships/update`
- `GET /api/saved?user_id=...`
- `POST /api/saved`
- `GET /api/applications?user_id=...`
- `POST /api/applications`
- `POST /api/mentor-chat`
- `POST /api/rag/reindex`

Dashboard summary, checklist, saved internships, applications, and mentor chat require a valid Supabase bearer token. The backend verifies the token with Supabase and binds private records to that verified user ID. Checklist progress is stored per account in PostgreSQL and syncs across devices. Scraping and full reindex require the admin header.

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

## GCP Deployment

The repository includes a deploy script at `deploy/gcp/deploy-backend.sh`. It builds the Docker image with Cloud Build, runs the database schema migration as a one-off Cloud Run Job, deploys the public API service, deploys a separate scraper Cloud Run Job, grants that job invoker access to a dedicated scheduler identity, and creates or updates a daily Cloud Scheduler trigger. The API service is public at the Cloud Run IAM layer for browser access; its private data routes still require verified Supabase sessions, and admin operations still require `INTERNIQ_ADMIN_TOKEN`.

Before running it, create a Cloud SQL PostgreSQL database named `interniq` with the `vector` extension available, and create an `interniq_app` login role. For example, connect as the Cloud SQL `postgres` account and run `CREATE ROLE interniq_app LOGIN PASSWORD 'use-a-unique-generated-password';`. The migration job applies `backend/schema.sql` and grants this role only the table and sequence permissions the application uses. Use the Cloud SQL `postgres` account only for the migration URL; the API and scraper use the restricted app account. Store these values as Secret Manager secrets, each with at least one enabled version:

- `interniq-database-url`
- `interniq-migration-database-url`
- `groq-api-key`
- `gemini-api-key`
- `interniq-admin-token`

Create each secret and add a version from protected local files outside the repository. This keeps credentials out of shell history and source control:

```bash
gcloud secrets create interniq-database-url --replication-policy=automatic --project "$PROJECT_ID"
gcloud secrets create interniq-migration-database-url --replication-policy=automatic --project "$PROJECT_ID"
gcloud secrets create groq-api-key --replication-policy=automatic --project "$PROJECT_ID"
gcloud secrets create gemini-api-key --replication-policy=automatic --project "$PROJECT_ID"
gcloud secrets create interniq-admin-token --replication-policy=automatic --project "$PROJECT_ID"
gcloud secrets versions add interniq-database-url --data-file="/secure/path/interniq-app-database-url.txt" --project "$PROJECT_ID"
gcloud secrets versions add interniq-migration-database-url --data-file="/secure/path/interniq-migration-database-url.txt" --project "$PROJECT_ID"
gcloud secrets versions add groq-api-key --data-file="/secure/path/groq-api-key.txt" --project "$PROJECT_ID"
gcloud secrets versions add gemini-api-key --data-file="/secure/path/gemini-api-key.txt" --project "$PROJECT_ID"
gcloud secrets versions add interniq-admin-token --data-file="/secure/path/interniq-admin-token.txt" --project "$PROJECT_ID"
```

For Cloud SQL, set `interniq-database-url` to the `interniq_app` PostgreSQL URL and `interniq-migration-database-url` to the `postgres` admin URL. Both use the Cloud SQL Unix socket, for example `postgresql://USER:PASSWORD@/interniq?host=/cloudsql/PROJECT_ID:REGION:INSTANCE`. URL-encode reserved characters in the username or password. For a database hosted elsewhere, use that provider's TLS-enabled URLs for both roles and leave `CLOUDSQL_INSTANCE` empty.

The deploying identity needs permissions to enable services, build and push images, create/update Cloud Run resources and service accounts, manage the Scheduler job, and grant IAM bindings. The script creates `interniq-api`, `interniq-migration`, `interniq-scraper`, and `interniq-scheduler` service accounts if absent. The API identity can read its database URL and provider/admin secrets; the migration identity can read only the admin database URL; the scraper can read the app database URL and Gemini key; the scheduler identity can invoke only the scraper job. The first three identities receive Cloud SQL Client when `CLOUDSQL_INSTANCE` is set. The deployer also needs `iam.serviceAccounts.actAs` for these service accounts.

Run the script in an authenticated Google Cloud CLI shell (Google Cloud Shell builds the image remotely, so it does not need a local Docker daemon):

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="asia-south1"
export FRONTEND_ORIGIN="https://your-firebase-project.web.app"
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
export CLOUDSQL_INSTANCE="your-gcp-project-id:asia-south1:interniq-db"
bash deploy/gcp/deploy-backend.sh
```

Optional settings include `SCRAPE_SCHEDULE` (default `0 3 * * *`), `SCHEDULER_TIME_ZONE` (default `Asia/Kolkata`), `SERVICE`, `MIGRATION_JOB`, `SCRAPER_JOB`, and `IMAGE_TAG`. The script applies the schema before deploying the API. After deployment, run the scraper once to populate or refresh internship data:

```bash
gcloud run jobs execute interniq-scraper --region "$REGION" --project "$PROJECT_ID" --wait
```

The script and commands use Cloud Run Jobs with Cloud Scheduler's OAuth identity to execute scheduled scraping. See Google's [Cloud Run job deployment guide](https://cloud.google.com/run/docs/create-jobs) and [job scheduling guide](https://cloud.google.com/run/docs/execute/jobs-on-schedule) for permissions and execution details.

### Frontend

The repository includes Firebase Hosting configuration in `firebase.json`, including SPA rewrites for React Router, long-lived caching for hashed Vite assets, and basic browser security headers. Create/enable a Hosting site in Firebase, then build with the public runtime settings and deploy:

```bash
npm install --global firebase-tools
firebase login
export VITE_API_BASE_URL="https://your-cloud-run-backend-url"
export VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
export VITE_SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
export VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
npm run deploy:hosting -- --project "$PROJECT_ID"
```

The frontend environment values are embedded in the static build. Only use the Supabase public anon/publishable key here; never put provider API keys, the database URL, or the admin token in `VITE_*` variables. The configured frontend origin must be included in the Cloud Run `ALLOWED_ORIGINS` value, and the Supabase Auth redirect URLs must include the Firebase Hosting domain.

### Storage And Monitoring

- Store uploaded resumes and related files in Cloud Storage.
- Store secrets in Secret Manager.
- Use Cloud Logging and Error Reporting for backend and scraper observability.

## Notes

The local scrape → chunk → embed → retrieve → structured response workflow is implemented. The container and repeatable Cloud Run deployment path are included; executing the first hosted deployment still requires a configured GCP project, database, secrets, and deployment identity.

Supabase Auth provides the email/password and Google sessions. Private API routes verify the bearer token and enforce the authenticated user ID; database row-level security policies are restored when the schema runs on Supabase.
