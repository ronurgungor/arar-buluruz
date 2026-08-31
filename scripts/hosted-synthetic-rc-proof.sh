#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

for command in bun curl openssl psql rclone sha256sum; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required command: $command" >&2; exit 1; }
done

: "${MANAGED_SUPABASE_PROJECT_REF:?required}"
: "${MANAGED_SUPABASE_DB_URL:?required}"
: "${MANAGED_SUPABASE_ANON_KEY:?required}"
: "${MANAGED_SUPABASE_S3_ENDPOINT:?required}"
: "${MANAGED_SUPABASE_S3_REGION:?required}"
: "${MANAGED_SUPABASE_S3_ACCESS_KEY_ID:?required}"
: "${MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY:?required}"

approved_ref="rzosrvenlvhijeckmwyc"
fixture_listing_id="93000000-0000-4000-8000-000000000001"
fixture_photo_id="94000000-0000-4000-8000-000000000001"
fixture_path="listings/${fixture_listing_id}/${fixture_photo_id}.webp"
managed_api_url="https://${MANAGED_SUPABASE_PROJECT_REF}.supabase.co"
shim_origin="http://127.0.0.1:54329"
app_origin="http://127.0.0.1:4173"
artifact_origin="http://127.0.0.1:4174"

if [[ "$MANAGED_SUPABASE_PROJECT_REF" != "$approved_ref" ]]; then
  echo "Hosted RC proof refused a non-dedicated Arar Buluruz project ref." >&2
  exit 1
fi
case "$MANAGED_SUPABASE_PROJECT_REF" in
  jlbsoraqnlricbyagxdk|gwgrwwvaiizfsqaacnhf)
    echo "Hosted RC proof refuses Tarladan project refs." >&2
    exit 1
    ;;
esac
case "$MANAGED_SUPABASE_S3_ENDPOINT" in
  "https://${approved_ref}.supabase.co/storage/v1/s3"|"https://${approved_ref}.storage.supabase.co/storage/v1/s3") ;;
  *) echo "Hosted RC S3 endpoint is outside the approved project." >&2; exit 1 ;;
esac

managed_psql() {
  PGSSLMODE=require psql "$MANAGED_SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 "$@"
}
managed_scalar() {
  managed_psql -Atc "$1"
}
application_fingerprint() {
  managed_scalar "
    select md5(
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from public.listings x), '[]') || E'\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.listing_photos x), '[]') || E'\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.listing_id)::text from private.listing_external_sales_links x), '[]')
    );
  "
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

expected_versions="$(canonical_migration_versions)"
actual_versions="$(managed_scalar "select string_agg(version, ' ' order by version) from supabase_migrations.schema_migrations;")"
if [[ "$actual_versions" != "$expected_versions" ]]; then
  echo "Hosted managed project migration chain mismatch: $actual_versions" >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from auth.users;")" != "0" ]]; then
  echo "Hosted managed project contains Auth users." >&2
  exit 1
fi

if [[ "$(managed_scalar "select count(*) from public.listings where id <> '${fixture_listing_id}'::uuid;")" != "0" ]]; then
  echo "Hosted managed project contains unexpected listing rows before RC proof." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos where listing_id <> '${fixture_listing_id}'::uuid or id <> '${fixture_photo_id}'::uuid;")" != "0" ]]; then
  echo "Hosted managed project contains unexpected photo metadata before RC proof." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from storage.objects where bucket_id <> 'listing_photos' or name <> '${fixture_path}';")" != "0" ]]; then
  echo "Hosted managed project contains unexpected Storage objects before RC proof." >&2
  exit 1
fi

baseline_fingerprint="$(application_fingerprint)"
if [[ -z "$baseline_fingerprint" ]]; then
  echo "Hosted RC baseline DB fingerprint is empty." >&2
  exit 1
fi

work_dir="$(mktemp -d)"
baseline_storage="$work_dir/storage-before"
shim_log="$work_dir/shim.log"
app_log="$work_dir/operator-app.log"
shim_pid=""
app_pid=""
cleanup() {
  set +e
  [[ -n "$app_pid" ]] && kill "$app_pid" 2>/dev/null || true
  [[ -n "$shim_pid" ]] && kill "$shim_pid" 2>/dev/null || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

print_redacted_hosted_logs() {
  python3 - "$app_log" "$shim_log" <<'PY'
import os
import sys
from pathlib import Path

secrets = [
    os.environ.get("MANAGED_SUPABASE_DB_URL", ""),
    os.environ.get("MANAGED_SUPABASE_ANON_KEY", ""),
    os.environ.get("MANAGED_SUPABASE_S3_ACCESS_KEY_ID", ""),
    os.environ.get("MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY", ""),
    os.environ.get("HOSTED_RC_DIAGNOSTIC_SHIM_TOKEN", ""),
]
for filename in sys.argv[1:]:
    path = Path(filename)
    print(f"--- redacted {path.name} (tail) ---", file=sys.stderr)
    if not path.exists():
        print("[log missing]", file=sys.stderr)
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for secret in secrets:
        if secret:
            text = text.replace(secret, "[REDACTED]")
    print(text[-16000:], file=sys.stderr)
PY
}

configure_source_rclone
mkdir -p "$baseline_storage"
rclone copy "source:listing_photos" "$baseline_storage" --checkers 4 --transfers 2
(
  cd "$baseline_storage"
  find . -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum
) > "$work_dir/storage-before.sha256"
rclone size "source:listing_photos" --json > "$work_dir/storage-before-size.json"

shim_token="$(openssl rand -hex 32)"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then printf '::add-mask::%s\n' "$shim_token"; fi
export HOSTED_RC_DIAGNOSTIC_SHIM_TOKEN="$shim_token"

HOSTED_RC_PROJECT_REF="$MANAGED_SUPABASE_PROJECT_REF" \
HOSTED_RC_DB_URL="$MANAGED_SUPABASE_DB_URL" \
HOSTED_RC_S3_ENDPOINT="$MANAGED_SUPABASE_S3_ENDPOINT" \
HOSTED_RC_S3_REGION="$MANAGED_SUPABASE_S3_REGION" \
HOSTED_RC_S3_ACCESS_KEY_ID="$MANAGED_SUPABASE_S3_ACCESS_KEY_ID" \
HOSTED_RC_S3_SECRET_ACCESS_KEY="$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY" \
HOSTED_RC_SHIM_TOKEN="$shim_token" \
HOSTED_RC_SHIM_PORT=54329 \
HOSTED_RC_LIST_DELAY_MS=600 \
  bun scripts/hosted-rc-transport-shim.ts >"$shim_log" 2>&1 &
shim_pid=$!

for attempt in $(seq 1 60); do
  if curl --fail --silent "$shim_origin/__health" >/dev/null; then break; fi
  if ! kill -0 "$shim_pid" 2>/dev/null; then cat "$shim_log" >&2; exit 1; fi
  sleep 1
  if [[ "$attempt" == "60" ]]; then cat "$shim_log" >&2; exit 1; fi
done

VITE_LISTINGS_SOURCE=supabase \
VITE_SUPABASE_URL="$managed_api_url" \
VITE_SUPABASE_ANON_KEY="$MANAGED_SUPABASE_ANON_KEY" \
VITE_PILOT_INTAKE_E164="+12025550199" \
VITE_PILOT_OPERATOR_UI=enabled \
PILOT_OPERATOR_ENABLED=enabled \
PILOT_OPERATOR_SUPABASE_URL="$shim_origin" \
PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY="$shim_token" \
  bun --bun vite dev --host 127.0.0.1 --port 4173 --strictPort >"$app_log" 2>&1 &
app_pid=$!

for attempt in $(seq 1 60); do
  if curl --fail --silent "$app_origin/ara" >/dev/null; then break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then cat "$app_log" >&2; exit 1; fi
  sleep 1
  if [[ "$attempt" == "60" ]]; then cat "$app_log" >&2; exit 1; fi
done

if ! BASE_URL="$app_origin" \
  BACKEND_ORIGIN="$managed_api_url" \
  SHIM_ORIGIN="$shim_origin" \
  SHIM_PID="$shim_pid" \
    bun scripts/hosted-pilot-operator-browser-e2e.ts; then
  echo "Hosted founder browser proof failed; printing redacted app/shim diagnostics." >&2
  print_redacted_hosted_logs
  exit 1
fi

# The browser proof intentionally terminates the test-only shim to prove the founder UI fails closed.
shim_pid=""
kill "$app_pid" 2>/dev/null || true
wait "$app_pid" 2>/dev/null || true
app_pid=""

final_fingerprint="$(application_fingerprint)"
if [[ "$final_fingerprint" != "$baseline_fingerprint" ]]; then
  echo "Hosted RC DB fingerprint drifted: before=$baseline_fingerprint after=$final_fingerprint" >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from auth.users;")" != "0" ]]; then
  echo "Hosted RC proof created Auth users." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from public.listings;")" != "1" ]]; then
  echo "Hosted RC proof left extra listing rows." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from public.listings where id = '${fixture_listing_id}'::uuid;")" != "1" ]]; then
  echo "Hosted RC proof did not restore the canonical baseline listing state." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos;")" != "1" ]]; then
  echo "Hosted RC proof left orphan or extra photo metadata." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos p left join public.listings l on l.id = p.listing_id where l.id is null;")" != "0" ]]; then
  echo "Hosted RC proof left orphan private photo metadata." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from storage.objects;")" != "1" ]]; then
  echo "Hosted RC proof left extra Storage objects." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from storage.objects where bucket_id = 'listing_photos' and name = '${fixture_path}';")" != "1" ]]; then
  echo "Hosted RC proof did not restore the canonical Storage baseline." >&2
  exit 1
fi

configure_source_rclone
rclone check "$baseline_storage" "source:listing_photos" --download
rclone size "source:listing_photos" --json > "$work_dir/storage-after-size.json"
python3 - "$work_dir/storage-before-size.json" "$work_dir/storage-after-size.json" <<'PY'
import json, sys
from pathlib import Path
before = json.loads(Path(sys.argv[1]).read_text())
after = json.loads(Path(sys.argv[2]).read_text())
for key in ("count", "bytes"):
    if int(before.get(key, -1)) != int(after.get(key, -2)):
        raise SystemExit(f"Storage before/after mismatch for {key}: {before} != {after}")
print(f"Hosted RC Storage before/after consistency verified: {after.get('count')} object(s), {after.get('bytes')} byte(s).")
PY

# Build the actual public pilot-rc artifact with all privileged test credentials removed from the build environment.
rm -rf .output
(
  unset MANAGED_SUPABASE_DB_URL MANAGED_SUPABASE_S3_ACCESS_KEY_ID MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY
  unset HOSTED_RC_SHIM_TOKEN HOSTED_RC_DIAGNOSTIC_SHIM_TOKEN PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY PILOT_OPERATOR_ENABLED VITE_PILOT_OPERATOR_UI
  ARAR_BUILD_PROFILE=pilot-rc \
  VITE_LISTINGS_SOURCE=supabase \
  VITE_SUPABASE_URL="$managed_api_url" \
  VITE_SUPABASE_ANON_KEY="$MANAGED_SUPABASE_ANON_KEY" \
  VITE_PILOT_INTAKE_E164="+12025550199" \
  NITRO_PRESET=node-server \
    bun run build
)

grep -R --binary-files=without-match -F -m1 'pilot-rc|listings=supabase|gate1=off|operator=off' .output >/dev/null
for forbidden_text in \
  'V0 test sürümü' \
  'İlanlar örnektir' \
  'Demo ilan oluşturma' \
  'Giriş demosu' \
  'Kurucu pilot işlemleri' \
  'Pending ilan ve fotoğrafı kaydet'; do
  if grep -R --binary-files=without-match -F "$forbidden_text" .output/public >/dev/null 2>&1; then
    echo "pilot-rc public artifact contains forbidden residue: $forbidden_text" >&2
    exit 1
  fi
done
for privileged_marker in \
  'PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY' \
  'register_sanitized_listing_photo' \
  'get_listing_photo_inventory'; do
  if grep -R --binary-files=without-match -F "$privileged_marker" .output/public >/dev/null 2>&1; then
    echo "pilot-rc public artifact exposes privileged/internal marker: $privileged_marker" >&2
    exit 1
  fi
done
for secret_value in "$MANAGED_SUPABASE_DB_URL" "$MANAGED_SUPABASE_S3_ACCESS_KEY_ID" "$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY" "$shim_token"; do
  if grep -R --binary-files=without-match -F "$secret_value" .output >/dev/null 2>&1; then
    echo "pilot-rc artifact contains a privileged secret value." >&2
    exit 1
  fi
done

BASE_URL="$artifact_origin" BACKEND_ORIGIN="$managed_api_url" \
  bun scripts/pilot-rc-artifact-e2e.ts

echo "Hosted synthetic RC operator journey, final-state consistency and pilot-rc artifact proof passed."