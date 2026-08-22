#!/usr/bin/env bash
set -euo pipefail

backup_dir="${APPLICATION_BACKUP_DIR:-}"
db_url="${APPLICATION_DB_URL:-}"

if [[ -z "$backup_dir" ]]; then
  echo "APPLICATION_BACKUP_DIR is required." >&2
  exit 1
fi
if [[ -z "$db_url" ]]; then
  echo "APPLICATION_DB_URL is required." >&2
  exit 1
fi
for command in docker psql sha256sum supabase; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "$command is required." >&2
    exit 1
  fi
done

run_psql() {
  psql "$db_url" -X -v ON_ERROR_STOP=1 "$@"
}

rm -rf "$backup_dir"
mkdir -p "$backup_dir"

# Managed-platform backup uses the official Supabase CLI dump path. The CLI applies
# Supabase-specific filtering to reserved roles/internal schemas; application data
# is additionally constrained to the repository-owned public/private schemas.
supabase db dump --db-url "$db_url" -f "$backup_dir/roles.sql" --role-only
supabase db dump --db-url "$db_url" -f "$backup_dir/schema.sql" --schema public,private
supabase db dump --db-url "$db_url" -f "$backup_dir/data.sql" --schema public,private --use-copy --data-only

for file in roles.sql schema.sql data.sql; do
  if [[ ! -s "$backup_dir/$file" ]]; then
    echo "Managed application backup $file is empty." >&2
    exit 1
  fi
done

if grep -qE '(COPY|INSERT INTO)[[:space:]]+(storage|auth)\.' "$backup_dir/data.sql"; then
  echo "Managed application data backup unexpectedly contains Supabase-managed schema rows." >&2
  exit 1
fi

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
  echo "Expected exactly one canonical managed Storage photo policy, found $policy_count." >&2
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
  echo "Managed Storage photo policy qualifier could not be exported." >&2
  exit 1
fi

cat > "$backup_dir/storage-policy.sql" <<SQL
-- Application-owned cross-schema policy captured from the managed source.
-- No storage.objects rows or provider-managed Storage DDL are included.
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

echo "Managed portable application DB backup and Storage policy created and checksum-verified."
