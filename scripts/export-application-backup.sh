#!/usr/bin/env bash
set -euo pipefail

backup_dir="${APPLICATION_BACKUP_DIR:-}"
if [[ -z "$backup_dir" ]]; then
  echo "APPLICATION_BACKUP_DIR is required." >&2
  exit 1
fi
for command in docker sha256sum supabase; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "$command is required." >&2
    exit 1
  fi
done

db_container="${APPLICATION_DB_CONTAINER:-$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n 1)}"
if [[ -z "$db_container" ]]; then
  echo "Local Supabase Postgres container was not found." >&2
  exit 1
fi

run_psql() {
  docker exec -i "$db_container" \
    psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

rm -rf "$backup_dir"
mkdir -p "$backup_dir"

# Portable application state only. Supabase-managed auth/storage internals are not
# treated as application-owned DB state. Storage object bytes are backed up through
# the S3 protocol separately.
supabase db dump --local -f "$backup_dir/roles.sql" --role-only
supabase db dump --local -f "$backup_dir/schema.sql" --schema public,private
supabase db dump --local -f "$backup_dir/data.sql" --schema public,private --use-copy --data-only

for file in roles.sql schema.sql data.sql; do
  if [[ ! -s "$backup_dir/$file" ]]; then
    echo "Application backup $file is empty." >&2
    exit 1
  fi
done

if grep -qE '(COPY|INSERT INTO)[[:space:]]+(storage|auth)\.' "$backup_dir/data.sql"; then
  echo "Application data backup unexpectedly contains Supabase-managed schema rows." >&2
  exit 1
fi

# Public photo signing is now application-mediated. There must be no anonymous/public
# SELECT policy on storage.objects to export or replay: direct object reads, listing and
# Storage signing all remain outside the browser role.
anonymous_storage_select_policies="$(run_psql -Atc "
  select count(*)
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polcmd = 'r'
    and (
      0::oid = any(p.polroles)
      or (select oid from pg_catalog.pg_roles where rolname = 'anon') = any(p.polroles)
    );
")"
if [[ "$anonymous_storage_select_policies" != "0" ]]; then
  echo "Expected zero anonymous/public Storage object SELECT policies, found $anonymous_storage_select_policies." >&2
  exit 1
fi

sha256sum \
  "$backup_dir/roles.sql" \
  "$backup_dir/schema.sql" \
  "$backup_dir/data.sql" \
  > "$backup_dir/sha256sums.txt"
(
  cd "$backup_dir"
  sha256sum --check --strict sha256sums.txt
)

echo "Portable application DB backup created and checksum-verified with zero anonymous Storage object SELECT policies."
