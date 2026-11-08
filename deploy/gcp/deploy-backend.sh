#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$PROJECT_ROOT"

: "${PROJECT_ID:?Set PROJECT_ID to your Google Cloud project ID}"
: "${FRONTEND_ORIGIN:?Set FRONTEND_ORIGIN to the deployed frontend origin}"
: "${SUPABASE_URL:?Set SUPABASE_URL to your Supabase project URL}"
: "${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY to your Supabase public anon/publishable key}"

REGION="${REGION:-asia-south1}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-interniq}"
SERVICE="${SERVICE:-interniq-api}"
MIGRATION_JOB="${MIGRATION_JOB:-interniq-migrate}"
SCRAPER_JOB="${SCRAPER_JOB:-interniq-scraper}"
SCHEDULER_JOB="${SCHEDULER_JOB:-interniq-scraper-daily}"
RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT:-interniq-api@${PROJECT_ID}.iam.gserviceaccount.com}"
MIGRATION_SERVICE_ACCOUNT="${MIGRATION_SERVICE_ACCOUNT:-interniq-migration@${PROJECT_ID}.iam.gserviceaccount.com}"
SCRAPER_SERVICE_ACCOUNT="${SCRAPER_SERVICE_ACCOUNT:-interniq-scraper@${PROJECT_ID}.iam.gserviceaccount.com}"
SCHEDULER_SERVICE_ACCOUNT="${SCHEDULER_SERVICE_ACCOUNT:-interniq-scheduler@${PROJECT_ID}.iam.gserviceaccount.com}"
SCRAPE_SCHEDULE="${SCRAPE_SCHEDULE:-0 3 * * *}"
SCHEDULER_TIME_ZONE="${SCHEDULER_TIME_ZONE:-Asia/Kolkata}"
CLOUDSQL_INSTANCE="${CLOUDSQL_INSTANCE:-}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}/interniq:${IMAGE_TAG}"

for tool in gcloud; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "Required command not found: $tool" >&2
    exit 1
  }
done

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  --project "$PROJECT_ID"

if ! gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" \
  --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" \
    --repository-format docker \
    --location "$REGION" \
    --description "InternIQ container images" \
    --project "$PROJECT_ID"
fi

create_service_account_if_missing() {
  local email="$1"
  local account_id="${email%@*}"
  if ! gcloud iam service-accounts describe "$email" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$account_id" \
      --display-name "$account_id" \
      --project "$PROJECT_ID"
  fi
}

create_service_account_if_missing "$RUNTIME_SERVICE_ACCOUNT"
create_service_account_if_missing "$MIGRATION_SERVICE_ACCOUNT"
create_service_account_if_missing "$SCRAPER_SERVICE_ACCOUNT"
create_service_account_if_missing "$SCHEDULER_SERVICE_ACCOUNT"

for secret in interniq-database-url interniq-migration-database-url groq-api-key gemini-api-key interniq-admin-token; do
  gcloud secrets describe "$secret" --project "$PROJECT_ID" >/dev/null 2>&1 || {
    echo "Create Secret Manager secret '$secret' and add a version before deploying." >&2
    exit 1
  }
done

grant_secret_access() {
  local service_account="$1"
  local secret="$2"
  gcloud secrets add-iam-policy-binding "$secret" \
    --member "serviceAccount:${service_account}" \
    --role roles/secretmanager.secretAccessor \
    --project "$PROJECT_ID" \
    --quiet
}

for secret in interniq-database-url groq-api-key gemini-api-key interniq-admin-token; do
  grant_secret_access "$RUNTIME_SERVICE_ACCOUNT" "$secret"
done
grant_secret_access "$MIGRATION_SERVICE_ACCOUNT" interniq-migration-database-url
grant_secret_access "$SCRAPER_SERVICE_ACCOUNT" interniq-database-url
grant_secret_access "$SCRAPER_SERVICE_ACCOUNT" gemini-api-key

if [[ -n "$CLOUDSQL_INSTANCE" ]]; then
  for service_account in "$RUNTIME_SERVICE_ACCOUNT" "$MIGRATION_SERVICE_ACCOUNT" "$SCRAPER_SERVICE_ACCOUNT"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member "serviceAccount:${service_account}" \
      --role roles/cloudsql.client \
      --quiet
  done
fi

echo "Building ${IMAGE_URI}"
gcloud builds submit --tag "$IMAGE_URI" --project "$PROJECT_ID" .

migration_args=(
  run jobs deploy "$MIGRATION_JOB"
  --image "$IMAGE_URI"
  --region "$REGION"
  --project "$PROJECT_ID"
  --command python
  --args /app/backend/init_db.py
  --service-account "$MIGRATION_SERVICE_ACCOUNT"
  --tasks 1
  --parallelism 1
  --max-retries 0
  --task-timeout 900s
  --memory 1Gi
  --cpu 1
  --set-secrets "DATABASE_URL=interniq-migration-database-url:latest"
  --quiet
)
if [[ -n "$CLOUDSQL_INSTANCE" ]]; then
  migration_args+=(--set-cloudsql-instances "$CLOUDSQL_INSTANCE")
fi
gcloud "${migration_args[@]}"
gcloud run jobs execute "$MIGRATION_JOB" \
  --region "$REGION" --project "$PROJECT_ID" --wait

service_args=(
  run deploy "$SERVICE"
  --image "$IMAGE_URI"
  --region "$REGION"
  --project "$PROJECT_ID"
  --platform managed
  --port 8080
  --allow-unauthenticated
  --service-account "$RUNTIME_SERVICE_ACCOUNT"
  --memory 2Gi
  --cpu 2
  --concurrency 20
  --max 10
  --timeout 900
  --set-env-vars "ALLOWED_ORIGINS=${FRONTEND_ORIGIN},SUPABASE_URL=${SUPABASE_URL},SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},GROQ_MODEL=openai/gpt-oss-20b"
  --set-secrets "DATABASE_URL=interniq-database-url:latest,GROQ_API_KEY=groq-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest,INTERNIQ_ADMIN_TOKEN=interniq-admin-token:latest"
  --quiet
)
if [[ -n "$CLOUDSQL_INSTANCE" ]]; then
  service_args+=(--add-cloudsql-instances "$CLOUDSQL_INSTANCE")
fi
gcloud "${service_args[@]}"

job_args=(
  run jobs deploy "$SCRAPER_JOB"
  --image "$IMAGE_URI"
  --region "$REGION"
  --project "$PROJECT_ID"
  --command python
  --args /app/scraper/update_internships.py
  --service-account "$SCRAPER_SERVICE_ACCOUNT"
  --tasks 1
  --parallelism 1
  --max-retries 1
  --task-timeout 3600s
  --memory 2Gi
  --cpu 2
  --set-env-vars "GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview,RAG_EMBEDDING_DIMENSIONS=768,RAG_CHUNK_SIZE=900,RAG_CHUNK_OVERLAP=120"
  --set-secrets "DATABASE_URL=interniq-database-url:latest,GEMINI_API_KEY=gemini-api-key:latest"
  --quiet
)
if [[ -n "$CLOUDSQL_INSTANCE" ]]; then
  job_args+=(--set-cloudsql-instances "$CLOUDSQL_INSTANCE")
fi
gcloud "${job_args[@]}"

gcloud run jobs add-iam-policy-binding "$SCRAPER_JOB" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --member "serviceAccount:${SCHEDULER_SERVICE_ACCOUNT}" \
  --role roles/run.invoker \
  --quiet

SCHEDULER_URI="https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${SCRAPER_JOB}:run"
SCHEDULER_ARGS=(
  --location "$REGION"
  --schedule "$SCRAPE_SCHEDULE"
  --time-zone "$SCHEDULER_TIME_ZONE"
  --uri "$SCHEDULER_URI"
  --http-method POST
  --oauth-service-account-email "$SCHEDULER_SERVICE_ACCOUNT"
  --quiet
)

if gcloud scheduler jobs describe "$SCHEDULER_JOB" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$SCHEDULER_JOB" "${SCHEDULER_ARGS[@]}" --project "$PROJECT_ID"
else
  gcloud scheduler jobs create http "$SCHEDULER_JOB" "${SCHEDULER_ARGS[@]}" --project "$PROJECT_ID"
fi

echo "Deployment complete. Service URL: $(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
echo "Run the scraper once now with: gcloud run jobs execute ${SCRAPER_JOB} --region ${REGION} --project ${PROJECT_ID} --wait"
