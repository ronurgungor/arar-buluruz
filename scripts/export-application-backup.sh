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

# The photo-signing RLS policy is application-owned but is attached to the
# Supabase-managed storage.objects table. Dumping the whole storage schema would
# capture provider internals and caused restore collisions previously. Preserve
# only this policy definition as a separately checksummed application artifact.
policy_count="$(run_psql -Atc "
  select count(*)
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polname = 'Public can sign active listing photo objects'
    and p.polcmd = 'r'
    and p.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'anon')]
    and p.polwithcheck is null;
")"
if [[ "$policy_count" != "1" ]]; then
  echo "Expected exactly one canonical application-owned Storage photo policy, found $policy_count." >&2
  exit 1
fi

policy_qual="$(run_psql -Atc "
  select pg_catalog.pg_get_expr(p.polqual, p.polrelid)
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polname = 'Public can sign active listing photo objects';
")"
if [[ -z "$policy_qual" ]]; then
  echo "Storage photo policy qualifier could not be exported." >&2
  exit 1
fi

cat > "$backup_dir/storage-policy.sql" <<SQL
-- Application-owned cross-schema policy captured from the source database.
-- No storage.objects rows or Supabase-managed Storage DDL are included.
drop policy if exists "Public can sign active listing photo objects" on storage.objects;
create policy "Public can sign active listing photo objects"
on storage.objects
for select
to anon
using (
$policy_qual
);
SQL

sha256sum \
  "$backup_dir/roles.sql" \
  "$backup_dir/schema.sql" \
  "$backup_dir/data.sql" \
  "$backup_dir/storage-policy.sql" \
  > "$backup_dir/sha256sums.txt"
(
  cd "$backup_dir"
  sha256sum --check --strict sha256sums.txt
)

echo "Portable application DB backup and cross-schema Storage policy created and checksum-verified."
