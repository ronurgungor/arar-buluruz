#!/usr/bin/env bash
set -euo pipefail

backup_dir="${APPLICATION_BACKUP_DIR:-}"
if [[ -z "$backup_dir" ]]; then
  echo "APPLICATION_BACKUP_DIR is required." >&2
  exit 1
fi
if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required." >&2
  exit 1
fi

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

sha256sum "$backup_dir/roles.sql" "$backup_dir/schema.sql" "$backup_dir/data.sql" \
  > "$backup_dir/sha256sums.txt"
(
  cd "$backup_dir"
  sha256sum --check --strict sha256sums.txt
)

echo "Portable application DB backup created and checksum-verified."
