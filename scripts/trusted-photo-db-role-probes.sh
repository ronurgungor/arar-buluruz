#!/usr/bin/env bash
set -euo pipefail

db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n 1)"
if [[ -z "$db_container" ]]; then
  echo "Local Supabase Postgres container was not found."
  exit 1
fi

dump_db_diagnostics() {
  local health_output
  local health_status

  echo "PostgreSQL container state after probe anomaly:"
  docker inspect "$db_container" \
    --format 'status={{.State.Status}} running={{.State.Running}} restarting={{.State.Restarting}} exit_code={{.State.ExitCode}}{{if .State.Health}} health={{.State.Health.Status}}{{end}}' \
    || true

  echo "PostgreSQL container log tail around probe anomaly:"
  docker logs --since 2m "$db_container" 2>&1 | tail -n 400 || true

  set +e
  health_output="$(
    docker exec -i "$db_container" \
      psql -X -v ON_ERROR_STOP=1 -Atq -U postgres -d postgres -c 'SELECT 1;' 2>&1
  )"
  health_status=$?
  set -e

  echo "Fresh post-anomaly database health probe exit=${health_status}: ${health_output}"
}

run_denied_probe() {
  local role="$1"
  local label="$2"
  local sql="$3"
  local output
  local status

  set +e
  output="$(
    docker exec -i "$db_container" \
      psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres 2>&1 <<SQL
SET ROLE ${role};
${sql}
SQL
  )"
  status=$?
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "${label} unexpectedly succeeded."
    exit 1
  fi

  if ! grep -Eq 'ERROR:[[:space:]]+42501:' <<<"$output"; then
    echo "${label} failed, but not with expected SQLSTATE 42501."
    printf '%s\n' "$output"
    dump_db_diagnostics
    exit 1
  fi

  echo "${label} -> SQLSTATE 42501"
}

listing_id="63000000-0000-4000-8000-000000000001"
photo_id="64000000-0000-4000-8000-000000000001"
object_path="listings/${listing_id}/${photo_id}.webp"

for role in anon authenticated; do
  run_denied_probe \
    "$role" \
    "$role direct private.listing_photos SELECT" \
    'SELECT * FROM private.listing_photos LIMIT 1;'

  run_denied_probe \
    "$role" \
    "$role get_deliverable_listing_photo EXECUTE" \
    "SELECT * FROM public.get_deliverable_listing_photo('${listing_id}'::uuid, '${photo_id}'::uuid);"

  run_denied_probe \
    "$role" \
    "$role register_sanitized_listing_photo EXECUTE" \
    "SELECT public.register_sanitized_listing_photo('${listing_id}'::uuid, '${photo_id}'::uuid, '${object_path}'::text, 1::bigint, 0::smallint);"
done

health_result="$(
  docker exec -i "$db_container" \
    psql -X -v ON_ERROR_STOP=1 -Atq -U postgres -d postgres -c 'SELECT 1;'
)"

if [[ "$health_result" != "1" ]]; then
  echo "Post-probe database health sentinel failed: expected SELECT 1 -> 1, got '${health_result}'."
  dump_db_diagnostics
  exit 1
fi

echo "Post-probe database health sentinel -> SELECT 1 succeeded."
