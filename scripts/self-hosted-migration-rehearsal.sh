#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/ops/self-hosted/upstream.lock"

for command in bun curl docker git openssl python3 rclone sha256sum supabase; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is missing: $command" >&2
    exit 1
  fi
done

work_dir="$(mktemp -d)"
upstream_dir="$work_dir/supabase-upstream"
db_backup_dir="$work_dir/db-backup"
storage_backup_dir="$work_dir/storage-backup"
target_compose_override="$work_dir/target-ci.override.yml"
target_started=false
source_started=false
source_preserved=false

cleanup() {
  set +e
  if [[ "$target_started" == "true" && -d "$upstream_dir/docker" ]]; then
    (
      cd "$upstream_dir/docker"
      docker compose -f docker-compose.yml -f "$target_compose_override" down -v --remove-orphans
    ) >/dev/null 2>&1
  fi

  cd "$repo_root" || true
  if [[ "$source_started" == "true" || "$source_preserved" == "true" ]]; then
    supabase stop --no-backup >/dev/null 2>&1 || true
  fi

  # Self-hosted Postgres/Storage containers create root-owned bind-mount files.
  # Try ordinary removal first and use passwordless CI sudo only when required.
  rm -rf "$work_dir" 2>/dev/null || {
    if command -v sudo >/dev/null 2>&1; then
      sudo rm -rf "$work_dir" >/dev/null 2>&1 || true
    fi
  }
}
trap cleanup EXIT

extract_status_value() {
  local status_env="$1"
  local key="$2"
  local value
  value="$(printf '%s\n' "$status_env" | grep "^${key}=" | head -n 1)"
  value="${value#*=}"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

read_env_value() {
  local file="$1"
  local key="$2"
  local line
  line="$(grep "^${key}=" "$file" | tail -n 1)"
  printf '%s' "${line#*=}"
}

mask_if_actions() {
  local value="$1"
  if [[ -n "${GITHUB_ACTIONS:-}" && -n "$value" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

require_value() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Required value is missing: $name" >&2
    exit 1
  fi
}

require_http_ok() {
  local url="$1"
  local key="$2"
  local context="$3"
  local body_file="$work_dir/http-body.txt"
  local status
  status="$(
    curl --silent --show-error --output "$body_file" --write-out '%{http_code}' \
      --header "apikey: $key" \
      --header "Authorization: Bearer $key" \
      "$url"
  )"
  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "$context failed with HTTP $status: $(cat "$body_file")" >&2
    exit 1
  fi
}

wait_for_target_api() {
  local api_url="$1"
  local service_key="$2"
  for attempt in $(seq 1 60); do
    if curl --silent --fail \
      --header "apikey: $service_key" \
      --header "Authorization: Bearer $service_key" \
      "$api_url/rest/v1/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "Pinned self-host API did not become ready." >&2
  return 1
}

wait_for_target_storage_schema() {
  for attempt in $(seq 1 60); do
    readiness="$(
      docker exec supabase-db psql -X -At -U postgres -d postgres -c \
        "select to_regclass('storage.objects') is not null
           and to_regclass('storage.buckets') is not null
           and to_regprocedure('storage.allow_only_operation(text)') is not null;" \
        2>/dev/null || true
    )"
    if [[ "$readiness" == "t" ]]; then
      return 0
    fi
    sleep 2
  done

  echo "Pinned self-host Storage database schema did not become ready." >&2
  docker logs --tail 200 supabase-storage >&2 || true
  return 1
}

cd "$repo_root"

# Source: an isolated local Supabase stack that exercises the same application,
# database and Storage contracts before the managed Free project is used. It is
# intentionally synthetic-only and is preserved across the cutover rehearsal so
# rollback can be proven after the target has been destroyed.
supabase start -x realtime,imgproxy,studio,mailpit,edge-runtime,logflare,vector,supavisor
source_started=true
supabase db reset --local --no-seed
supabase seed buckets --local

source_status="$(supabase status -o env)"
source_api_url="$(extract_status_value "$source_status" API_URL)"
source_anon_key="$(extract_status_value "$source_status" ANON_KEY)"
source_service_role_key="$(extract_status_value "$source_status" SERVICE_ROLE_KEY)"
source_s3_url="$(extract_status_value "$source_status" STORAGE_S3_URL)"
source_s3_access_key="$(extract_status_value "$source_status" S3_PROTOCOL_ACCESS_KEY_ID)"
source_s3_secret_key="$(extract_status_value "$source_status" S3_PROTOCOL_ACCESS_KEY_SECRET)"
source_s3_region="$(extract_status_value "$source_status" S3_PROTOCOL_REGION)"

for pair in \
  "source API URL:$source_api_url" \
  "source anon key:$source_anon_key" \
  "source service role key:$source_service_role_key" \
  "source S3 URL:$source_s3_url" \
  "source S3 access key:$source_s3_access_key" \
  "source S3 secret key:$source_s3_secret_key" \
  "source S3 region:$source_s3_region"; do
  require_value "${pair%%:*}" "${pair#*:}"
done
mask_if_actions "$source_anon_key"
mask_if_actions "$source_service_role_key"
mask_if_actions "$source_s3_access_key"
mask_if_actions "$source_s3_secret_key"

MIGRATION_SUPABASE_URL="$source_api_url" \
MIGRATION_SUPABASE_ANON_KEY="$source_anon_key" \
MIGRATION_SUPABASE_SERVICE_ROLE_KEY="$source_service_role_key" \
  bun scripts/migration-photo-fixture.ts seed

APPLICATION_BACKUP_DIR="$db_backup_dir" \
  bash scripts/export-application-backup.sh

SOURCE_S3_ENDPOINT="$source_s3_url" \
SOURCE_S3_REGION="$source_s3_region" \
SOURCE_S3_ACCESS_KEY_ID="$source_s3_access_key" \
SOURCE_S3_SECRET_ACCESS_KEY="$source_s3_secret_key" \
STORAGE_BACKUP_DIR="$storage_backup_dir" \
  bash scripts/storage-object-backup-restore.sh backup

# Stop without --no-backup. The source is the rollback point and its local Docker
# resources must survive while the isolated pinned target is built and verified.
supabase stop
source_started=false
source_preserved=true

# Pin both the semantic release tag and the exact commit/files used by the rehearsal.
git clone --quiet --depth 1 --branch "$SUPABASE_SELF_HOSTED_TAG" \
  https://github.com/supabase/supabase.git "$upstream_dir"
actual_upstream_commit="$(git -C "$upstream_dir" rev-parse HEAD)"
if [[ "$actual_upstream_commit" != "$SUPABASE_SELF_HOSTED_COMMIT" ]]; then
  echo "Self-host upstream commit drift: expected $SUPABASE_SELF_HOSTED_COMMIT, got $actual_upstream_commit" >&2
  exit 1
fi

cd "$upstream_dir/docker"
for spec in \
  "docker-compose.yml:$DOCKER_COMPOSE_BLOB_SHA" \
  ".env.example:$ENV_EXAMPLE_BLOB_SHA" \
  "utils/generate-keys.sh:$GENERATE_KEYS_BLOB_SHA"; do
  file="${spec%%:*}"
  expected="${spec#*:}"
  actual="$(git hash-object "$file")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Pinned upstream file drift for $file: expected $expected, got $actual" >&2
    exit 1
  fi
done

cp .env.example .env
sh utils/generate-keys.sh --update-env >/dev/null
rm -f .env.old

python3 - .env <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
lines = path.read_text(encoding="utf-8").splitlines()
updates = {
    "SUPABASE_PUBLIC_URL": "http://127.0.0.1:18000",
    "API_EXTERNAL_URL": "http://127.0.0.1:18000/auth/v1",
    "API_GW_HTTP_PORT": "127.0.0.1:18000",
    "SITE_URL": "http://127.0.0.1:18000",
    "ADDITIONAL_REDIRECT_URLS": "",
    "DISABLE_SIGNUP": "true",
    "ENABLE_EMAIL_SIGNUP": "false",
    "ENABLE_ANONYMOUS_USERS": "false",
    "ENABLE_PHONE_SIGNUP": "false",
    "OPENAI_API_KEY": "",
    "STUDIO_DEFAULT_ORGANIZATION": "Arar Buluruz Synthetic",
    "STUDIO_DEFAULT_PROJECT": "Arar Buluruz Migration Rehearsal",
    "FUNCTIONS_VERIFY_JWT": "true",
}
seen = set()
out = []
for line in lines:
    if "=" in line and not line.lstrip().startswith("#"):
        key = line.split("=", 1)[0]
        if key in updates:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
            continue
    out.append(line)
missing = sorted(set(updates) - seen)
if missing:
    raise SystemExit(f"Pinned self-host .env is missing expected keys: {missing}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
PY

# Fail if upstream insecure examples survived key generation/configuration.
if grep -Eq \
  'your-super-secret|this_password_is_insecure|your-32-character-encryption-key|OPENAI_API_KEY=sk-proj-|MINIO_ROOT_PASSWORD=secret1234' \
  .env; then
  echo "Pinned self-host target still contains an insecure example secret." >&2
  exit 1
fi

cat > "$target_compose_override" <<'YAML'
services:
  db:
    ports:
      - "127.0.0.1:15432:5432"
YAML

target_postgres_password="$(read_env_value .env POSTGRES_PASSWORD)"
target_anon_key="$(read_env_value .env ANON_KEY)"
target_service_role_key="$(read_env_value .env SERVICE_ROLE_KEY)"
target_s3_access_key="$(read_env_value .env S3_PROTOCOL_ACCESS_KEY_ID)"
target_s3_secret_key="$(read_env_value .env S3_PROTOCOL_ACCESS_KEY_SECRET)"
target_s3_region="$(read_env_value .env REGION)"

for pair in \
  "target Postgres password:$target_postgres_password" \
  "target anon key:$target_anon_key" \
  "target service role key:$target_service_role_key" \
  "target S3 access key:$target_s3_access_key" \
  "target S3 secret key:$target_s3_secret_key" \
  "target S3 region:$target_s3_region"; do
  require_value "${pair%%:*}" "${pair#*:}"
done
mask_if_actions "$target_postgres_password"
mask_if_actions "$target_anon_key"
mask_if_actions "$target_service_role_key"
mask_if_actions "$target_s3_access_key"
mask_if_actions "$target_s3_secret_key"

target_api_url="http://127.0.0.1:18000"
target_s3_url="$target_api_url/storage/v1/s3"
target_db_url="postgresql://postgres:${target_postgres_password}@127.0.0.1:15432/postgres"

# Start only the services required by the application's DB/REST/Storage path.
# Auth, Realtime, Functions, Analytics, Supavisor and public Studio ports are absent.
docker compose -f docker-compose.yml -f "$target_compose_override" up -d \
  db rest imgproxy storage meta studio api-gw
target_started=true
wait_for_target_api "$target_api_url" "$target_service_role_key"
wait_for_target_storage_schema

# Exact image and host-exposure assertions are part of the production-readiness
# review: the synthetic target must not accidentally become a network-accessible service.
if [[ "$(docker inspect --format '{{.Config.Image}}' supabase-db)" != "$POSTGRES_IMAGE" ]]; then
  echo "Pinned Postgres image mismatch." >&2
  exit 1
fi
if [[ "$(docker inspect --format '{{.Config.Image}}' supabase-storage)" != "$STORAGE_IMAGE" ]]; then
  echo "Pinned Storage image mismatch." >&2
  exit 1
fi
if [[ "$(docker inspect --format '{{.Config.Image}}' supabase-rest)" != "$POSTGREST_IMAGE" ]]; then
  echo "Pinned PostgREST image mismatch." >&2
  exit 1
fi
if [[ "$(docker inspect --format '{{.Config.Image}}' supabase-envoy)" != "$API_GATEWAY_IMAGE" ]]; then
  echo "Pinned API gateway image mismatch." >&2
  exit 1
fi

if [[ "$(docker port supabase-db 5432/tcp)" != "127.0.0.1:15432" ]]; then
  echo "Target database is not loopback-only." >&2
  docker port supabase-db >&2 || true
  exit 1
fi
if [[ "$(docker port supabase-envoy 8000/tcp)" != "127.0.0.1:18000" ]]; then
  echo "Target API gateway is not loopback-only." >&2
  docker port supabase-envoy >&2 || true
  exit 1
fi
for unexpected in supabase-auth realtime-dev.supabase-realtime supabase-edge-functions supabase-pooler; do
  if docker ps --format '{{.Names}}' | grep -Fxq "$unexpected"; then
    echo "Out-of-scope self-host service unexpectedly running: $unexpected" >&2
    exit 1
  fi
done

postgres_major="$(docker exec supabase-db psql -X -At -U postgres -d postgres -c "show server_version_num" | cut -c1-2)"
if [[ "$postgres_major" != "17" ]]; then
  echo "Pinned target is not PostgreSQL 17: server_version_num=$postgres_major" >&2
  exit 1
fi

# Schema is GitHub-migration canonical. Apply it only after Storage has completed
# its own managed schema bootstrap so the cross-schema signing policy has a stable
# storage.objects target. Then restore portable role settings and app data.
cd "$repo_root"
supabase db push --db-url "$target_db_url" --include-all --yes

(
  cd "$db_backup_dir"
  sha256sum --check --strict sha256sums.txt
)
docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < "$db_backup_dir/roles.sql"
{
  printf '%s\n' 'SET session_replication_role = replica;'
  cat "$db_backup_dir/data.sql"
} | docker exec -i supabase-db \
  psql -X --single-transaction -v ON_ERROR_STOP=1 -U postgres -d postgres

# Create the destination bucket through Storage itself. This makes target
# storage.objects metadata authoritative instead of copying provider-internal rows.
bucket_body='{"id":"listing_photos","name":"listing_photos","public":false,"file_size_limit":8388608,"allowed_mime_types":["image/webp"]}'
bucket_response="$work_dir/create-bucket.json"
bucket_status="$(
  curl --silent --show-error --output "$bucket_response" --write-out '%{http_code}' \
    --request POST \
    --header "apikey: $target_service_role_key" \
    --header "Authorization: Bearer $target_service_role_key" \
    --header 'content-type: application/json' \
    --data "$bucket_body" \
    "$target_api_url/storage/v1/bucket"
)"
if [[ "$bucket_status" -lt 200 || "$bucket_status" -ge 300 ]]; then
  echo "Target listing_photos bucket creation failed with HTTP $bucket_status: $(cat "$bucket_response")" >&2
  exit 1
fi

TARGET_S3_ENDPOINT="$target_s3_url" \
TARGET_S3_REGION="$target_s3_region" \
TARGET_S3_ACCESS_KEY_ID="$target_s3_access_key" \
TARGET_S3_SECRET_ACCESS_KEY="$target_s3_secret_key" \
STORAGE_BACKUP_DIR="$storage_backup_dir" \
  bash scripts/storage-object-backup-restore.sh restore

docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < ops/self-hosted/restore-verification.sql

MIGRATION_SUPABASE_URL="$target_api_url" \
MIGRATION_SUPABASE_ANON_KEY="$target_anon_key" \
MIGRATION_SUPABASE_SERVICE_ROLE_KEY="$target_service_role_key" \
  bun scripts/migration-photo-fixture.ts verify

# Destroy the candidate target before proving rollback. A failed or aborted cutover
# must leave the preserved source capable of serving the exact same synthetic app path.
cd "$upstream_dir/docker"
docker compose -f docker-compose.yml -f "$target_compose_override" down -v --remove-orphans
target_started=false
rm -f .env

cd "$repo_root"
supabase start -x realtime,imgproxy,studio,mailpit,edge-runtime,logflare,vector,supavisor
source_started=true
source_preserved=false
rollback_status="$(supabase status -o env)"
rollback_api_url="$(extract_status_value "$rollback_status" API_URL)"
rollback_anon_key="$(extract_status_value "$rollback_status" ANON_KEY)"
rollback_service_role_key="$(extract_status_value "$rollback_status" SERVICE_ROLE_KEY)"

MIGRATION_SUPABASE_URL="$rollback_api_url" \
MIGRATION_SUPABASE_ANON_KEY="$rollback_anon_key" \
MIGRATION_SUPABASE_SERVICE_ROLE_KEY="$rollback_service_role_key" \
  bun scripts/migration-photo-fixture.ts verify

require_http_ok "$rollback_api_url/rest/v1/" "$rollback_service_role_key" \
  "rollback source REST health"

echo "Pinned self-host DB + Storage migration and source rollback rehearsal passed."
