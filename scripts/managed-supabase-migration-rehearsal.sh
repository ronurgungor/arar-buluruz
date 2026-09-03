#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/ops/self-hosted/upstream.lock"

for command in bun curl docker git openssl psql python3 rclone sha256sum supabase; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is missing: $command" >&2
    exit 1
  fi
done

: "${MANAGED_SUPABASE_PROJECT_REF:?MANAGED_SUPABASE_PROJECT_REF is required}"
: "${MANAGED_SUPABASE_DB_URL:?MANAGED_SUPABASE_DB_URL is required}"
: "${MANAGED_SUPABASE_ANON_KEY:?MANAGED_SUPABASE_ANON_KEY is required}"
: "${MANAGED_SUPABASE_S3_ENDPOINT:?MANAGED_SUPABASE_S3_ENDPOINT is required}"
: "${MANAGED_SUPABASE_S3_REGION:?MANAGED_SUPABASE_S3_REGION is required}"
: "${MANAGED_SUPABASE_S3_ACCESS_KEY_ID:?MANAGED_SUPABASE_S3_ACCESS_KEY_ID is required}"
: "${MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY:?MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY is required}"

listing_id="93000000-0000-4000-8000-000000000001"
photo_id="94000000-0000-4000-8000-000000000001"
contact_e164="+12025550141"
object_path="listings/${listing_id}/${photo_id}.webp"
expected_photo_sha256="fd89cface8e12174fb1c6e78c0a8b0b26be925820eed38713ff1d921d5f969df"
expected_photo_bytes="72"
managed_api_url="https://${MANAGED_SUPABASE_PROJECT_REF}.supabase.co"

if [[ ! "$MANAGED_SUPABASE_PROJECT_REF" =~ ^[a-z0-9]{20}$ ]]; then
  echo "Managed Supabase project ref has an unexpected format." >&2
  exit 1
fi

case "$MANAGED_SUPABASE_S3_ENDPOINT" in
  "https://${MANAGED_SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3"|\
  "https://${MANAGED_SUPABASE_PROJECT_REF}.storage.supabase.co/storage/v1/s3") ;;
  *)
    echo "Managed S3 endpoint does not belong to the approved project ref." >&2
    exit 1
    ;;
esac

python3 - "$MANAGED_SUPABASE_DB_URL" "$MANAGED_SUPABASE_PROJECT_REF" <<'PY'
import sys
from urllib.parse import urlparse

url = urlparse(sys.argv[1])
ref = sys.argv[2]
if url.scheme not in {"postgres", "postgresql"}:
    raise SystemExit("Managed DB URL must use postgres/postgresql.")
if not url.hostname or not url.username:
    raise SystemExit("Managed DB URL must include a host and username.")

host = url.hostname.lower()
user = url.username
if host == f"db.{ref}.supabase.co":
    if user != "postgres":
        raise SystemExit("Direct managed DB URL must use the postgres role.")
elif host.endswith(".pooler.supabase.com"):
    if user != f"postgres.{ref}":
        raise SystemExit("Managed pooler URL username does not match the approved project ref.")
else:
    raise SystemExit(f"Managed DB URL host is outside Supabase platform boundaries: {host}")
PY

work_dir="$(mktemp -d)"
upstream_dir="$work_dir/supabase-upstream"
db_backup_dir="$work_dir/db-backup"
storage_backup_dir="$work_dir/storage-backup"
fixture_file="$work_dir/fixture.webp"
target_compose_override="$work_dir/target-ci.override.yml"
target_started=false

cleanup() {
  set +e
  if [[ "$target_started" == "true" && -d "$upstream_dir/docker" ]]; then
    (
      cd "$upstream_dir/docker"
      docker compose -f docker-compose.yml -f "$target_compose_override" down -v --remove-orphans
    ) >/dev/null 2>&1
  fi
  rm -rf "$work_dir" 2>/dev/null || {
    if command -v sudo >/dev/null 2>&1; then
      sudo rm -rf "$work_dir" >/dev/null 2>&1 || true
    fi
  }
}
trap cleanup EXIT

mask_if_actions() {
  local value="$1"
  if [[ -n "${GITHUB_ACTIONS:-}" && -n "$value" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

read_env_value() {
  local file="$1"
  local key="$2"
  local line
  line="$(grep "^${key}=" "$file" | tail -n 1)"
  printf '%s' "${line#*=}"
}

require_value() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Required value is missing: $name" >&2
    exit 1
  fi
}

managed_psql() {
  PGSSLMODE=require psql "$MANAGED_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 "$@"
}

managed_scalar() {
  managed_psql -Atc "$1"
}

managed_exec() {
  managed_psql -c "$1" >/dev/null
}

application_fingerprint() {
  local db_url="$1"
  PGSSLMODE="${2:-require}" psql "$db_url" -X -v ON_ERROR_STOP=1 -Atc "
    select md5(
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from public.listings x), '[]') || E'\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.listing_photos x), '[]') || E'\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.listing_id)::text from private.listing_external_sales_links x), '[]') || E'\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.sellers x), '[]') || E'\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.seller_sessions x), '[]')
    );
  "
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
  local readiness
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

wait_for_target_storage_api() {
  local api_url="$1"
  local service_key="$2"
  local body_file="$work_dir/storage-readiness.json"
  local container_health
  local status
  for attempt in $(seq 1 60); do
    container_health="$(
      docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' supabase-storage \
        2>/dev/null || true
    )"
    status="$(
      curl --silent --show-error --output "$body_file" --write-out '%{http_code}' \
        --header "apikey: $service_key" \
        --header "Authorization: Bearer $service_key" \
        "$api_url/storage/v1/bucket" 2>/dev/null || true
    )"
    if [[ "$container_health" == "healthy" && "$status" =~ ^[0-9]{3}$ \
      && "$status" -ge 200 && "$status" -lt 300 ]]; then
      return 0
    fi
    sleep 2
  done
  echo "Pinned self-host Storage API did not become ready; container=$container_health HTTP=${status:-none}." >&2
  if [[ -f "$body_file" ]]; then cat "$body_file" >&2 || true; fi
  docker logs --tail 200 supabase-storage >&2 || true
  return 1
}

configure_source_rclone() {
  export RCLONE_CONFIG_SOURCE_TYPE=s3
  export RCLONE_CONFIG_SOURCE_PROVIDER=Other
  export RCLONE_CONFIG_SOURCE_ENDPOINT="$MANAGED_SUPABASE_S3_ENDPOINT"
  export RCLONE_CONFIG_SOURCE_REGION="$MANAGED_SUPABASE_S3_REGION"
  export RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID="$MANAGED_SUPABASE_S3_ACCESS_KEY_ID"
  export RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY="$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_SOURCE_FORCE_PATH_STYLE=true
}

mask_if_actions "$MANAGED_SUPABASE_DB_URL"
mask_if_actions "$MANAGED_SUPABASE_ANON_KEY"
mask_if_actions "$MANAGED_SUPABASE_S3_ACCESS_KEY_ID"
mask_if_actions "$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY"

cd "$repo_root"

# Fail closed before touching the managed source. This project is dedicated to
# synthetic migration readiness; any unknown user/listing/object means stop.
auth_users="$(managed_scalar "select count(*) from auth.users;")"
if [[ "$auth_users" != "0" ]]; then
  echo "Managed source contains Auth users; synthetic-only boundary violated." >&2
  exit 1
fi

if [[ "$(managed_scalar "select to_regclass('public.listings') is not null;")" == "t" ]]; then
  unexpected_listings="$(managed_scalar "select count(*) from public.listings where id <> '${listing_id}'::uuid;")"
  if [[ "$unexpected_listings" != "0" ]]; then
    echo "Managed source contains non-canonical listing rows; refusing rehearsal." >&2
    exit 1
  fi
fi

unexpected_objects="$(managed_scalar "
  select count(*)
  from storage.objects
  where bucket_id <> 'listing_photos'
     or name <> '${object_path}';
")"
if [[ "$unexpected_objects" != "0" ]]; then
  echo "Managed source contains unexpected Storage objects; refusing rehearsal." >&2
  exit 1
fi

unexpected_buckets="$(managed_scalar "select count(*) from storage.buckets where id <> 'listing_photos';")"
if [[ "$unexpected_buckets" != "0" ]]; then
  echo "Managed source contains unexpected Storage buckets; refusing rehearsal." >&2
  exit 1
fi

canonical_migration_versions() {
  local migration_file
  local filename
  local versions=""
  local -a migration_files=("$repo_root"/supabase/migrations/*.sql)

  for migration_file in "${migration_files[@]}"; do
    filename="${migration_file##*/}"
    if [[ ! -f "$migration_file" || ! "$filename" =~ ^([0-9]{14})_.+\.sql$ ]]; then
      echo "Unexpected canonical migration path: $migration_file" >&2
      return 1
    fi
    versions+="${BASH_REMATCH[1]} "
  done

  printf '%s' "${versions% }"
}

# Apply exactly the GitHub-canonical migration chain to the dedicated managed Free source.
PGSSLMODE=require supabase db push --db-url "$MANAGED_SUPABASE_DB_URL" --include-all --yes

expected_versions="$(canonical_migration_versions)"
actual_versions="$(managed_scalar "select string_agg(version, ' ' order by version) from supabase_migrations.schema_migrations;")"
if [[ "$actual_versions" != "$expected_versions" ]]; then
  echo "Managed migration history does not match canonical chain: $actual_versions" >&2
  exit 1
fi

# The bucket is infrastructure metadata, not provider table data to be migrated.
# Keep it private and narrow; no anonymous write policy is introduced.
managed_exec "
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('listing_photos', 'listing_photos', false, 8388608, array['image/webp']::text[])
  on conflict (id) do update
    set name = excluded.name,
        public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
"

bucket_contract="$(managed_scalar "
  select count(*)
  from storage.buckets
  where id = 'listing_photos'
    and name = 'listing_photos'
    and public = false
    and file_size_limit = 8388608
    and allowed_mime_types = array['image/webp']::text[];
")"
if [[ "$bucket_contract" != "1" ]]; then
  echo "Managed source listing_photos bucket does not match the canonical private contract." >&2
  exit 1
fi

# Idempotent rerun cleanup is restricted to the exact deterministic fixture.
configure_source_rclone
if rclone lsf "source:listing_photos/${object_path}" >/dev/null 2>&1; then
  rclone deletefile "source:listing_photos/${object_path}" >/dev/null 2>&1 || true
fi
managed_exec "delete from public.listings where id = '${listing_id}'::uuid;"

bun scripts/materialize-migration-photo-fixture.ts "$fixture_file" > "$work_dir/fixture.json"
if [[ "$(sha256sum "$fixture_file" | awk '{print $1}')" != "$expected_photo_sha256" ]]; then
  echo "Materialized managed fixture hash drift." >&2
  exit 1
fi
if [[ "$(wc -c < "$fixture_file" | tr -d ' ')" != "$expected_photo_bytes" ]]; then
  echo "Materialized managed fixture byte-size drift." >&2
  exit 1
fi

# Prove the actual managed Storage API rejects anonymous direct writes. Use a
# deterministic non-canonical path so the canonical migration fixture is never
# targeted. If the security expectation ever breaks, remove only this exact
# synthetic probe through the already-authorized S3 test channel before failing.
anon_probe_dir="security-probes"
anon_probe_name="anon-direct-write-denied.webp"
anon_probe_path="${anon_probe_dir}/${anon_probe_name}"

anon_storage_write_policies="$(managed_scalar "
  select count(*)
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polcmd in ('a', 'w', 'd')
    and (
      0::oid = any(p.polroles)
      or (select oid from pg_catalog.pg_roles where rolname = 'anon') = any(p.polroles)
    );
")"
if [[ "$anon_storage_write_policies" != "0" ]]; then
  echo "Managed Storage exposes an anon/public INSERT, UPDATE or DELETE policy." >&2
  exit 1
fi

probe_metadata_count="$(managed_scalar "
  select count(*)
  from storage.objects
  where bucket_id = 'listing_photos'
    and name = '${anon_probe_path}';
")"
probe_s3_listing="$(rclone lsf "source:listing_photos/${anon_probe_dir}" --files-only 2>/dev/null || true)"
if [[ "$probe_metadata_count" != "0" ]] || grep -Fxq "$anon_probe_name" <<<"$probe_s3_listing"; then
  echo "Anonymous Storage write probe path is not clean before the negative test." >&2
  exit 1
fi

anon_write_status="$(curl --silent --show-error   --output "$work_dir/anon-storage-write.json"   --write-out '%{http_code}'   --request POST   --header "apikey: $MANAGED_SUPABASE_ANON_KEY"   --header "Authorization: Bearer $MANAGED_SUPABASE_ANON_KEY"   --header 'content-type: image/webp'   --header 'x-upsert: false'   --data-binary "@$fixture_file"   "$managed_api_url/storage/v1/object/listing_photos/${anon_probe_path}")"

if [[ "$anon_write_status" -ge 200 && "$anon_write_status" -lt 300 ]]; then
  rclone deletefile "source:listing_photos/${anon_probe_path}" >/dev/null 2>&1 || true

  probe_cleanup_ok=false
  for attempt in $(seq 1 10); do
    probe_metadata_count="$(managed_scalar "
      select count(*)
      from storage.objects
      where bucket_id = 'listing_photos'
        and name = '${anon_probe_path}';
    ")"
    probe_s3_listing="$(rclone lsf "source:listing_photos/${anon_probe_dir}" --files-only 2>/dev/null || true)"
    if [[ "$probe_metadata_count" == "0" ]] && ! grep -Fxq "$anon_probe_name" <<<"$probe_s3_listing"; then
      probe_cleanup_ok=true
      break
    fi
    sleep 1
  done

  if [[ "$probe_cleanup_ok" != "true" ]]; then
    echo "Anonymous managed Storage write unexpectedly succeeded and exact probe cleanup could not be proven." >&2
    exit 1
  fi

  echo "Anonymous managed Storage write unexpectedly succeeded; exact probe was cleaned before failure." >&2
  exit 1
fi

probe_metadata_count="$(managed_scalar "
  select count(*)
  from storage.objects
  where bucket_id = 'listing_photos'
    and name = '${anon_probe_path}';
")"
probe_s3_listing="$(rclone lsf "source:listing_photos/${anon_probe_dir}" --files-only 2>/dev/null || true)"
if [[ "$probe_metadata_count" != "0" ]] || grep -Fxq "$anon_probe_name" <<<"$probe_s3_listing"; then
  rclone deletefile "source:listing_photos/${anon_probe_path}" >/dev/null 2>&1 || true
  echo "Anonymous managed Storage write was rejected with HTTP $anon_write_status but left probe residue; exact cleanup attempted." >&2
  exit 1
fi

echo "Anonymous managed Storage direct write correctly rejected with HTTP $anon_write_status; probe absent afterward."

# Seed database rows through the existing service_role contract without creating
# a server API secret. The managed DB connection is postgres; SET ROLE exercises
# the same DB grants used by the backend role.
managed_psql <<SQL
begin;
set local role service_role;
insert into public.listings (
  id, title, description, price_amount, province, district,
  seller_display_name, search_keywords, contact_channel, contact_e164, status
) values (
  '${listing_id}'::uuid,
  'Sentetik migration fotoğraf ilanı',
  'Managed-to-self-host DB ve Storage restore doğrulaması için sentetik ilan.',
  100,
  'Tekirdağ',
  'Çorlu',
  'Sentetik Satıcı',
  array['sentetik','migration','fotoğraf']::text[],
  'whatsapp',
  '${contact_e164}',
  'pending'
);
commit;
SQL

rclone copyto "$fixture_file" "source:listing_photos/${object_path}" --immutable

managed_psql <<SQL
begin;
set local role service_role;
select public.register_sanitized_listing_photo(
  '${listing_id}'::uuid,
  '${photo_id}'::uuid,
  '${object_path}',
  ${expected_photo_bytes},
  0::smallint
);
commit;
SQL

# Pending rows/photos must remain invisible through the public contract.
pending_manifest="$(curl --silent --show-error --fail \
  --request POST \
  --header "apikey: $MANAGED_SUPABASE_ANON_KEY" \
  --header "Authorization: Bearer $MANAGED_SUPABASE_ANON_KEY" \
  --header 'content-type: application/json' \
  --data "{\"p_listing_id\":\"${listing_id}\"}" \
  "$managed_api_url/rest/v1/rpc/get_public_listing_photos")"
if [[ "$pending_manifest" != "[]" ]]; then
  echo "Pending managed photo manifest was exposed: $pending_manifest" >&2
  exit 1
fi

pending_sign_status="$(curl --silent --show-error --output "$work_dir/pending-sign.json" --write-out '%{http_code}' \
  --request POST \
  --header "apikey: $MANAGED_SUPABASE_ANON_KEY" \
  --header "Authorization: Bearer $MANAGED_SUPABASE_ANON_KEY" \
  --header 'content-type: application/json' \
  --data '{"expiresIn":60}' \
  "$managed_api_url/storage/v1/object/sign/listing_photos/${object_path}")"
if [[ "$pending_sign_status" -ge 200 && "$pending_sign_status" -lt 300 ]]; then
  echo "Pending managed photo signing unexpectedly succeeded." >&2
  exit 1
fi

managed_psql <<SQL
begin;
set local role service_role;
update public.listings
set contact_verified_at = now() - interval '2 minutes',
    contact_verification_method = 'whatsapp_same_number',
    publication_instruction_at = now() - interval '1 minute',
    private_seller_declaration_at = now() - interval '30 seconds',
    content_rights_declaration_at = now() - interval '30 seconds',
    status = 'published',
    published_at = now(),
    expires_at = now() + interval '1 day'
where id = '${listing_id}'::uuid;
commit;
SQL

# Verify managed source semantics and actual public application/signed-photo path.
managed_psql < ops/self-hosted/restore-verification.sql
MIGRATION_SUPABASE_URL="$managed_api_url" \
MIGRATION_SUPABASE_ANON_KEY="$MANAGED_SUPABASE_ANON_KEY" \
MIGRATION_SUPABASE_SERVICE_ROLE_KEY="unused-in-verify" \
  bun scripts/migration-photo-fixture.ts verify

source_fingerprint_before="$(application_fingerprint "$MANAGED_SUPABASE_DB_URL" require)"
require_value "managed source application fingerprint" "$source_fingerprint_before"

APPLICATION_DB_URL="$MANAGED_SUPABASE_DB_URL" \
APPLICATION_BACKUP_DIR="$db_backup_dir" \
PGSSLMODE=require \
  bash scripts/export-managed-application-backup.sh

SOURCE_S3_ENDPOINT="$MANAGED_SUPABASE_S3_ENDPOINT" \
SOURCE_S3_REGION="$MANAGED_SUPABASE_S3_REGION" \
SOURCE_S3_ACCESS_KEY_ID="$MANAGED_SUPABASE_S3_ACCESS_KEY_ID" \
SOURCE_S3_SECRET_ACCESS_KEY="$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY" \
STORAGE_BACKUP_DIR="$storage_backup_dir" \
  bash scripts/storage-object-backup-restore.sh backup

# Build the same exact pinned target used by the already-proven local rehearsal.
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
    "STUDIO_DEFAULT_PROJECT": "Arar Buluruz Managed Migration Rehearsal",
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

docker compose -f docker-compose.yml -f "$target_compose_override" up -d \
  db rest imgproxy storage meta studio api-gw
target_started=true
wait_for_target_api "$target_api_url" "$target_service_role_key"
wait_for_target_storage_schema
wait_for_target_storage_api "$target_api_url" "$target_service_role_key"

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

cd "$repo_root"
PGSSLMODE=disable supabase db push --db-url "$target_db_url" --include-all --yes
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

wait_for_target_storage_api "$target_api_url" "$target_service_role_key"
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

target_fingerprint="$(application_fingerprint "$target_db_url" disable)"
if [[ "$target_fingerprint" != "$source_fingerprint_before" ]]; then
  echo "Source/target application DB fingerprint mismatch: source=$source_fingerprint_before target=$target_fingerprint" >&2
  exit 1
fi

SOURCE_S3_ENDPOINT="$MANAGED_SUPABASE_S3_ENDPOINT" \
SOURCE_S3_REGION="$MANAGED_SUPABASE_S3_REGION" \
SOURCE_S3_ACCESS_KEY_ID="$MANAGED_SUPABASE_S3_ACCESS_KEY_ID" \
SOURCE_S3_SECRET_ACCESS_KEY="$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY" \
TARGET_S3_ENDPOINT="$target_s3_url" \
TARGET_S3_REGION="$target_s3_region" \
TARGET_S3_ACCESS_KEY_ID="$target_s3_access_key" \
TARGET_S3_SECRET_ACCESS_KEY="$target_s3_secret_key" \
STORAGE_BACKUP_DIR="$storage_backup_dir" \
  bash scripts/storage-object-backup-restore.sh verify-source-target

# Destroy the candidate target, then prove the managed source is unchanged and
# still serves the exact same public signed-photo bytes. This is the rollback proof.
cd "$upstream_dir/docker"
docker compose -f docker-compose.yml -f "$target_compose_override" down -v --remove-orphans
target_started=false
rm -f .env

cd "$repo_root"
MIGRATION_SUPABASE_URL="$managed_api_url" \
MIGRATION_SUPABASE_ANON_KEY="$MANAGED_SUPABASE_ANON_KEY" \
MIGRATION_SUPABASE_SERVICE_ROLE_KEY="unused-in-verify" \
  bun scripts/migration-photo-fixture.ts verify

source_fingerprint_after="$(application_fingerprint "$MANAGED_SUPABASE_DB_URL" require)"
if [[ "$source_fingerprint_after" != "$source_fingerprint_before" ]]; then
  echo "Managed source changed during target rehearsal: before=$source_fingerprint_before after=$source_fingerprint_after" >&2
  exit 1
fi

configure_source_rclone
rclone check "$storage_backup_dir/objects" "source:listing_photos" --download --one-way
rclone size "source:listing_photos" --json > "$work_dir/source-after-size.json"
python3 - "$storage_backup_dir/source-size.json" "$work_dir/source-after-size.json" <<'PY'
import json
import sys
from pathlib import Path
before = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
after = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
for key in ("count", "bytes"):
    if int(before.get(key, -1)) != int(after.get(key, -2)):
        raise SystemExit(f"Managed source Storage changed for {key}: before={before.get(key)} after={after.get(key)}")
if int(after.get("count", -1)) != 1 or int(after.get("bytes", -1)) != 72:
    raise SystemExit(f"Managed source Storage is outside deterministic fixture boundary: {after}")
print("Managed source Storage rollback consistency verified: 1 object / 72 bytes.")
PY

if [[ "$(managed_scalar "select count(*) from auth.users;")" != "0" ]]; then
  echo "Managed source gained Auth users during rehearsal." >&2
  exit 1
fi

if [[ "$(managed_scalar "select count(*) from private.sellers;")" != "0" ]] \
  || [[ "$(managed_scalar "select count(*) from private.seller_sessions;")" != "0" ]]; then
  echo "Managed source gained seller identity/session rows during provider rehearsal." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from public.listings where id <> '${listing_id}'::uuid;")" != "0" ]]; then
  echo "Managed source gained unexpected listing rows during rehearsal." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from storage.objects where bucket_id <> 'listing_photos' or name <> '${object_path}';")" != "0" ]]; then
  echo "Managed source gained unexpected Storage objects during rehearsal." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos;")" != "1" ]]; then
  echo "Managed source photo metadata count drifted after rehearsal." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos where listing_id <> '${listing_id}'::uuid or id <> '${photo_id}'::uuid;")" != "0" ]]; then
  echo "Managed source contains non-canonical private photo metadata after rehearsal." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos p left join public.listings l on l.id = p.listing_id where l.id is null;")" != "0" ]]; then
  echo "Managed source contains orphan private photo metadata after rehearsal." >&2
  exit 1
fi

echo "Managed Supabase provider invariants + pinned self-host DB/Storage migration, restore and source rollback proof passed."
