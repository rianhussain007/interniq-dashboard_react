# InternIQ Dashboard

InternIQ is a full-stack internship aggregation and AI career assistant platform for students. The current app includes a React dashboard, FastAPI backend, Python scraping pipeline, and a mentor assistant. The target production architecture is GCP: Firebase Hosting for the frontend, Cloud Run for FastAPI, Cloud SQL PostgreSQL with pgvector for data/RAG storage, Cloud Scheduler + Cloud Run Jobs for scraper automation, Secret Manager for credentials, and Cloud Logging/Error Reporting for operations.

## Current Features

- Live internship ingestion from public employer career-board APIs and Jobicy's public job feed.
- React, TypeScript, Vite, and Tailwind dashboard.
- FastAPI backend with CORS and environment-based configuration.
- Public keyword search and authenticated role/skill matching with location/source/work-mode filters and deadline sorting. Local mode uses transparent role and term matching; PostgreSQL mode adds Gemini embeddings and pgvector retrieval.
- SQLite-backed local email/password accounts, persistent sessions, private profiles, saved listings, applications, and checklist progress.
- On-demand internship update endpoint.
- Scraper update responses expose per-source and indexing totals as structured JSON.
- After a refresh, the internship feed shows each source's result and live role count, including sources that are empty or temporarily unavailable.
- Retrieval-augmented mentor using LangChain, Gemini embeddings, PostgreSQL/pgvector, and schema-validated Groq output.
- Scrape-to-search indexing: normalize postings, split them into overlapping chunks, embed only changed chunks, and update pgvector in the same database transaction.
- Mentor responses include grounded next steps, source references, and validated internship recommendations.
- Career tools: a resume builder with account-synced drafts and PDF content checklist, three resume layouts, role-based interview practice, personalized outreach drafts, and an internship compensation calculator.
- Explainable resume tailoring: compare a resume with a posting to see covered and missing skills, term coverage, and suggestions. Coverage is a checklist ratio, never an ATS score.
- Communities, events, and in-app notifications: join a community, post, RSVP to events, and receive notifications for new posts in communities you belong to.
- Dashboard workspace: one-click grouped paths to internships, saved roles, applications, profile setup, every career tool, and alert settings.
- Alert settings: choose which in-app alerts arrive (new matches, application deadlines, community posts) and how often InternIQ checks while the app is open; each posting and deadline alerts once.
- Optional alert email: students who opt in get one summary email for new matches and deadlines, with a signed unsubscribe link. Transient provider errors retry with backoff and permanent failures go to a local dead-letter file. Delivery is off until `RESEND_API_KEY` and `INTERNIQ_EMAIL_FROM` are set; `INTERNIQ_EMAIL_TRANSPORT="log"` writes messages to a local file for development and does not send email. Community alerts remain in-app.
- First-run personalization: the dashboard shows an onboarding card until a student adds skills, then confirms matching is on and links straight into ranked results, so the feed, search, and alerts are never silently generic.
- InternIQ Guide: a bottom-corner app-guide bot that routes students to the right tool (it is guidance, not career advice; the Mentor route handles that).

The six career tools work without an account or model-provider calls: the resume PDF checklist runs in the browser, and practice/outreach content is not sent to InternIQ. A signed-in account additionally syncs resume drafts across devices and enables the server-side job-description comparison, which sends that resume text to the backend. The compensation calculator uses only figures entered by the student; it does not claim to provide market-rate benchmarks. Saved listings, applications, profiles, checklist progress, communities, events, notifications, and personalized role matching need a local account.

## Prototype Readiness

This repository contains a local-first software prototype, not a hosted production service. Local sign-up, sign-in, account data, profiles, saves, applications, and checklist use SQLite without cloud credentials. Live listings need network access; built-in public-board defaults are used unless you override them. A new local database needs a live refresh before it has listings. Vector search and provider-backed mentor replies require PostgreSQL/pgvector and Gemini/Groq credentials. Cloud deployment and staging have not been provisioned.

The current provisional software readiness assessment is **TRL 4 (laboratory prototype)**: critical components have been built and checked locally with deterministic test doubles. This is not a NASA certification. Do not claim TRL 5 or higher until the end-to-end system has been tested in a realistic staging environment; deployment, monitoring, security, and user validation are separate release gates. The estimate and evidence log are in [`PROJECT_PLAN.md`](PROJECT_PLAN.md).

## Build Roadmap

1. [x] Fix integration paths across React, FastAPI, scraper, and docs.
2. [x] Store normalized internship records in PostgreSQL.
3. [x] Save internships and track applications with editable statuses and notes.
4. [x] Add LangChain chunking, Gemini embeddings, pgvector retrieval, and structured mentor output.
5. [x] Connect the mentor response and recommendations to the dashboard.
6. [x] Containerize the backend and define repeatable Cloud Run service, scraper job, and scheduler deployment.
7. [ ] Deploy the backend and database to a configured GCP project.
8. [ ] Deploy the frontend to Firebase Hosting or Cloud Storage + Cloud CDN.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Backend: Python, FastAPI, local account/session API, public ATS API clients, optional LangChain/Gemini/Groq services.
- Local data store: SQLite. Optional hosted data store: PostgreSQL.
- RAG vector store: PostgreSQL + pgvector.
- Planned deployment: GCP Cloud Run, Cloud SQL, Firebase Hosting, Cloud Scheduler, Secret Manager, Cloud Storage.

## Local Development

### Prerequisites

- Node.js 22.12 or later.
- Python 3.10 or later.
- pip.

### Environment

Copy the root environment example:

```bash
cp .env.example .env
```

Local development uses SQLite and local email/password auth; no Supabase or PostgreSQL service is needed:

```env
VITE_API_BASE_URL="http://127.0.0.1:8000"
VITE_AUTH_MODE="local"
ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
INTERNIQ_STORAGE_BACKEND="sqlite"
INTERNIQ_AUTH_MODE="local"
INTERNIQ_SQLITE_PATH="backend/data/interniq.sqlite3"
```

The frontend only reads `VITE_*` variables. Backend secrets must not be exposed through `VITE_*` variables. The SQLite file is created on first use and excluded from Git.

Alert email is optional and disabled by default. To enable inbox delivery, create a Resend API key and a verified sender, then set `RESEND_API_KEY` and `INTERNIQ_EMAIL_FROM` (plus `INTERNIQ_APP_URL` so links point at the deployed frontend). Once email is configured, the API runs a background scheduler for opted-in students every five minutes by default (`INTERNIQ_ALERT_SCHEDULER_INTERVAL_SECONDS`), so match and deadline email does not wait for an open browser; set `INTERNIQ_ALERT_SCHEDULER="off"` to disable it. Without a provider, the alert-settings email toggle is disabled and alerts remain in-app only. To inspect messages locally without sending anything, set `INTERNIQ_EMAIL_TRANSPORT="log"` and optionally `INTERNIQ_EMAIL_LOG` to choose the output file. The default local outbox can contain account email addresses and alert text; it is git-ignored.

Each email includes a signed one-click unsubscribe link that works without signing in: `GET` shows a confirmation button and `POST` (also sent by mail clients via `List-Unsubscribe-Post`) turns email alerts off for that account. Links are signed with `INTERNIQ_UNSUBSCRIBE_SECRET`, falling back to `INTERNIQ_ADMIN_TOKEN`; rotating it invalidates every link already delivered. Set `INTERNIQ_API_PUBLIC_URL` when the API is served from a different origin than the frontend, otherwise links derive the API origin from the app URL. The default outbox and dead-letter files can contain account email addresses and alert text; they are git-ignored.

To inspect or retry failed provider messages, run `python replay_dead_letters.py --dry-run` from `backend/` first, then `python replay_dead_letters.py` after reviewing the listed recipients and subject lines. Replays use the same configured email provider and keep messages that still fail.

The API also retries that queue by itself: once email is configured, a background pass runs every 30 minutes (`INTERNIQ_DEAD_LETTER_RETRY_SECONDS`) and drains whatever is queued, so a short provider outage heals without an operator. A failed pass stops after the first rejection rather than walking the whole queue against a dead provider, and set `INTERNIQ_DEAD_LETTER_RETRY="off"` to disable it. For a manual push, `cd backend && python replay_dead_letters.py` resends everything in that file and removes the records it delivered; anything that still fails stays put, so nothing is lost twice. Before each send it re-checks the account, so a student who unsubscribed or deleted their account after the failure is skipped rather than emailed anyway. `--dry-run` lists what would be resent without contacting the provider, and the command exits non-zero while messages remain.

Sends are retried up to three times with exponential backoff when the provider times out, rate-limits, or returns a 5xx; a rejection such as an unverified sender or bad recipient fails immediately, since retrying cannot fix it. A message that still fails is appended to `INTERNIQ_EMAIL_DEAD_LETTER` (default `backend/data/email_dead_letter.jsonl`, git-ignored) with its recipient, subject, text and error, so a provider outage never silently drops a notice. The student still sees the alert in-app either way.

The refresh uses built-in public employer boards for Stripe, Datadog, Figma, Roblox, Duolingo, Coinbase, Scale AI, MongoDB, Affirm, Pinterest, Cloudflare, Palantir, Ramp, Perplexity, Sentry, and Notion. Each refresh reads currently published roles and keeps only internship/co-op postings. Customize or replace a provider list with comma-separated board slugs:

```env
INTERNSHIP_GREENHOUSE_BOARDS="stripe:Stripe,datadog:Datadog"
INTERNSHIP_LEVER_BOARDS="palantir:Palantir"
INTERNSHIP_ASHBY_BOARDS="ramp:Ramp,notion:Notion"
```

Jobicy's public feed is also checked and its source URL is retained. Listings are deduplicated in SQLite. Sources can change their public board slugs or have no open internships on a given day; refresh output reports each source's status and count. LinkedIn is intentionally not crawled.

The source-provided posting date is not always the date a role was last renewed: some public boards return old-dated records that remain on the live board. InternIQ shows when it last saw each listing, but the employer's application page is the authority on whether a role is still accepting applications.

A new local database starts with an empty internships table. Use **Refresh live listings** to retrieve currently published internships from connected employer boards; InternIQ does not add invented companies or roles to the feed. Keyword search ranks by title, skills, company, description, and profile-skill overlap, and freshness only breaks ties, so unrelated postings are not returned as matches. In SQLite mode, role matching works offline by expanding the query with role concepts and the student's profile skills, returning a normalized ranking signal plus matched profile skills.

### Backend

From the project root:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

SQLite tables initialize automatically. Create an account using **Sign up** in the app. PostgreSQL mode is optional; set `INTERNIQ_STORAGE_BACKEND=postgres`, provide `DATABASE_URL`, and initialize the schema before starting the API.

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

Then check `http://localhost:8080/api/health`. The current listing refresh uses public JSON APIs and does not need a browser driver.

In PostgreSQL mode, the scraper refreshes the RAG index after upserting postings. To build or refresh it manually after changing the embedding model or chunk settings:

```bash
curl -X POST http://127.0.0.1:8000/api/rag/reindex -H "Content-Type: application/json" -H "X-InternIQ-Admin-Token: <INTERNIQ_ADMIN_TOKEN>" -d "{}"
```

### Scraper

Refresh current internship listings from configured public sources:

```bash
python scraper/update_internships.py
```

The local API also runs the same refresh workflow:

```bash
curl -X POST http://127.0.0.1:8000/api/internships/update
```

### Frontend

From the project root:

```bash
npm install
npm run dev
```

The app should be available at `http://localhost:5173` and call the backend through `VITE_API_BASE_URL`.

### Project Checks

Install the backend's development dependencies and run the deterministic backend suite from the project root:

```bash
npm run test
npx playwright install chromium
npm run test:e2e
npm run typecheck
python -m pip install -r backend/requirements-dev.txt
python -m pytest
```

The frontend interaction tests use a simulated browser. Four Playwright tests run Chromium against Vite and FastAPI, covering public search, guest sign-in return, mobile layout, guest career-tool access, and the full local register/restore/sign-in/profile flow. The UI tests use controlled API responses; backend tests use fake providers and isolated SQLite files where appropriate. These automated checks do not require API keys or a live database. CI runs frontend lint, frontend tests and build, backend tests and syntax checks, and a backend container build.

The older scripts named `backend/test_api*.py` and `backend/scraper/test_api*.py` are manual RapidAPI connectivity probes, not application tests. They may call an external service and require a valid API key; the default pytest suite intentionally does not collect them.

## API Routes

Current routes:

- `GET /api/health`
- `GET /api/internships`
- `GET /api/internships/{internship_id}`
- `GET /api/internships/search`
- `GET /api/internships/semantic-search`
- `GET /api/dashboard/summary`
- `GET /api/checklist`
- `PUT /api/checklist`
- `POST /api/internships/update`
- `GET /api/saved?user_id=...`
- `POST /api/saved`
- `DELETE /api/saved/{internship_id}`
- `GET /api/applications?user_id=...`
- `POST /api/applications`
- `POST /api/mentor-chat`
- `POST /api/rag/reindex`
- `GET /api/resume/draft`
- `PUT /api/resume/draft`
- `POST /api/resume/tailor`
- `GET /api/communities`
- `POST /api/communities`
- `POST /api/communities/join`
- `GET /api/communities/posts`
- `POST /api/communities/posts`
- `GET /api/events`
- `POST /api/events`
- `POST /api/events/rsvp`
- `GET /api/notifications`
- `GET /api/notifications/preferences`
- `PUT /api/notifications/preferences`
- `POST /api/notifications/read`
- `GET /api/notifications/unsubscribe` (signed confirmation page)
- `POST /api/notifications/unsubscribe` (signed one-click opt-out)

Dashboard summary, checklist, saved internships, applications, profile, mentor chat, and personalized search require a valid bearer session. Local mode verifies the session against SQLite and scopes private records to that user; PostgreSQL/Supabase verification is an optional hosted configuration. SQLite role matching works without model keys. PostgreSQL mode can embed queries with `GEMINI_API_KEY` and rank internship vectors. Public keyword search is available without sign-in. Local listing refresh checks public feeds; hosted refresh and full reindex require the admin header.

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

The optional PostgreSQL workflow implements scrape → chunk → embed → retrieve → structured response. Local SQLite accounts and role matching work without cloud services. The container and repeatable Cloud Run deployment path are included; executing the first hosted deployment still requires a configured GCP project, database, secrets, and deployment identity.

Local email/password authentication is the zero-configuration default. Supabase email/password and Google sessions are an optional future hosted mode. Private API routes verify the configured bearer session and enforce the authenticated user ID; database row-level security policies are restored when the schema runs on Supabase.
