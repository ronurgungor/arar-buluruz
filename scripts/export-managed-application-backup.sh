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

# Capture the managed platform's complete role inventory as evidence only. Hosted
# Supabase includes provider-internal roles (for example supabase_realtime_admin)
# that are not part of the portable application contract and may intentionally be
# absent from the pinned self-host target when the corresponding service is off.
supabase db dump --db-url "$db_url" -f "$backup_dir/source-roles.sql" --role-only

# The portable role restore contract must not create or alter provider-internal
# roles. The exact pinned target is expected to provision the standard runtime
# roles itself; canonical migrations then define application grants/RLS. Restoring
# this file therefore verifies those required runtime roles exist without mutating
# their platform-owned attributes.
cat > "$backup_dir/roles.sql" <<'SQL'
-- Portable Arar Buluruz application role contract.
-- Provider-internal hosted Supabase roles are intentionally not restored.
do $$
declare
  required_role text;
begin
  foreach required_role in array array[
    'anon',
    'authenticated',
    'service_role',
    'authenticator'
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_roles
      where rolname = required_role
    ) then
      raise exception 'required portable Supabase runtime role is missing: %', required_role;
    end if;
  end loop;
end;
$$;
SQL

# Application schema/data remain constrained to repository-owned public/private
# schemas. Provider-managed auth/storage rows and DDL are not included.
supabase db dump --db-url "$db_url" -f "$backup_dir/schema.sql" --schema public,private
supabase db dump --db-url "$db_url" -f "$backup_dir/data.sql" --schema public,private --use-copy --data-only

for file in source-roles.sql roles.sql schema.sql data.sql; do
  if [[ ! -s "$backup_dir/$file" ]]; then
    echo "Managed application backup $file is empty." >&2
    exit 1
  fi
done

required_source_roles="$(run_psql -Atc "
  select count(*)
  from pg_catalog.pg_roles
  where rolname in ('anon', 'authenticated', 'service_role', 'authenticator');
")"
if [[ "$required_source_roles" != "4" ]]; then
  echo "Managed source is missing one or more required portable Supabase runtime roles." >&2
  exit 1
fi

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
  "$backup_dir/source-roles.sql" \
  "$backup_dir/roles.sql" \
  "$backup_dir/schema.sql" \
  "$backup_dir/data.sql" \
  "$backup_dir/storage-policy.sql" \
  > "$backup_dir/sha256sums.txt"
(
  cd "$backup_dir"
  sha256sum --check --strict sha256sums.txt
)

echo "Managed application DB backup, source role inventory, portable role contract and Storage policy created and checksum-verified."
