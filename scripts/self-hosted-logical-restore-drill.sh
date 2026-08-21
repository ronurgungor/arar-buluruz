#!/usr/bin/env bash
set -euo pipefail

db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n 1)"
rest_container="$(docker ps --format '{{.Names}}' | grep '^supabase_rest_' | head -n 1)"

if [[ -z "$db_container" || -z "$rest_container" ]]; then
  echo "Local Supabase Postgres/PostgREST containers were not found."
  exit 1
fi

dump_dir="$(mktemp -d)"
trap 'rm -rf "$dump_dir"' EXIT

run_psql() {
  docker exec -i "$db_container" \
    psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

# Deterministic synthetic rows only. +1 202-555-0123 is retained as the
# repository's existing synthetic contact sentinel; no real seller data is used.
run_psql <<'SQL'
insert into public.listings (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
  search_keywords,
  status,
  created_at,
  updated_at,
  published_at,
  expires_at,
  contact_channel,
  contact_e164,
  contact_verified_at,
  contact_verification_method,
  publication_instruction_at
) values (
  '71000000-0000-4000-8000-000000000001',
  'Sentetik Restore İlanı',
  'Logical restore doğrulaması için yalnızca CI ortamında kullanılan sentetik ilan.',
  100.00,
  'Tekirdağ',
  'Çorlu',
  'Sentetik Satıcı',
  array['sentetik', 'restore'],
  'published',
  now() - interval '2 days',
  now() - interval '1 hour',
  now() - interval '1 hour',
  now() + interval '7 days',
  'whatsapp',
  '+12025550123',
  now() - interval '2 hours',
  'whatsapp_same_number',
  now() - interval '90 minutes'
), (
  '71000000-0000-4000-8000-000000000002',
  'Sentetik Taslak İlan',
  'Restore sonrasında anonim kullanıcıdan gizli kalması gereken sentetik taslak ilan.',
  50.00,
  'Tekirdağ',
  'Çorlu',
  'Sentetik Satıcı',
  array['sentetik', 'taslak'],
  'draft',
  now() - interval '1 day',
  now() - interval '1 day',
  null,
  null,
  null,
  null,
  null,
  null,
  null
);
SQL

# Match Supabase's managed-to-self-host guidance: dump roles, schema and data
# separately so the portable logical backup path itself is exercised. The schema
# and data dumps are explicitly limited to application-owned schemas. Storage
# metadata and Storage objects have a separate migration/restore contract and must
# not be silently folded into this database-only proof.
supabase db dump --local -f "$dump_dir/roles.sql" --role-only
supabase db dump --local -f "$dump_dir/schema.sql" --schema public,private
supabase db dump --local -f "$dump_dir/data.sql" --schema public,private --use-copy --data-only

for file in roles.sql schema.sql data.sql; do
  if [[ ! -s "$dump_dir/$file" ]]; then
    echo "Logical dump $file is empty."
    exit 1
  fi
done

if grep -qE '(COPY|INSERT INTO)[[:space:]]+storage\.' "$dump_dir/data.sql"; then
  echo "Application data dump unexpectedly contains Storage metadata."
  exit 1
fi

# Emulate a clean Supabase target without destroying managed auth/storage/extension
# schemas. Only application-owned schemas are removed; the target's public schema
# is recreated with the same server-side ownership boundary before restore.
run_psql <<'SQL'
drop schema if exists private cascade;
drop schema if exists public cascade;
create schema public authorization postgres;
grant all on schema public to postgres;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public revoke all on tables from anon, authenticated;
SQL

# Restore the three logical backup parts as one transaction. Triggers are disabled
# only for the data import session, matching the documented Supabase restore flow.
{
  cat "$dump_dir/roles.sql"
  cat "$dump_dir/schema.sql"
  printf '%s\n' 'SET session_replication_role = replica;'
  cat "$dump_dir/data.sql"
} | docker exec -i "$db_container" \
  psql -X --single-transaction -v ON_ERROR_STOP=1 -U postgres -d postgres

# Verify restored schema/security/lifecycle invariants independently of the app.
run_psql < ops/self-hosted/restore-verification.sql

# PostgREST may still hold the pre-drop schema cache. A local-only restart makes
# the restored schema the API source of truth before the application-level probe.
docker restart "$rest_container" >/dev/null

status_env="$(supabase status -o env)"
extract_status_value() {
  local value
  value="$(printf '%s\n' "$status_env" | grep "^$1=" | head -n 1)"
  value="${value#*=}"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

api_url="$(extract_status_value API_URL)"
anon_key="$(extract_status_value ANON_KEY)"
if [[ -z "$api_url" || -z "$anon_key" ]]; then
  echo "Local Supabase API_URL/ANON_KEY was not available after restore."
  exit 1
fi

LOCAL_SUPABASE_URL="$api_url" \
LOCAL_SUPABASE_ANON_KEY="$anon_key" \
  bun scripts/logical-restore-app-verification.ts

echo "Synthetic logical backup, clean application-schema restore and app-level verification passed."
