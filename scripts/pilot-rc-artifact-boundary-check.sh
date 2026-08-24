#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

test -d .output/public
test -f .output/server/index.mjs

grep -R --binary-files=without-match -F -m1 \
  'pilot-rc|listings=supabase|gate1=off|operator=off' .output >/dev/null

if git grep -nE 'HOSTED_RC_|hosted-rc-transport-shim|127\.0\.0\.1:54329' -- src public vite.config.ts; then
  echo "CI-only hosted transport shim marker reached runtime source." >&2
  exit 1
fi

for marker in \
  'HOSTED_RC_' \
  'hosted-rc-transport-shim' \
  'Hosted RC localhost transport shim' \
  '127.0.0.1:54329'; do
  if grep -R --binary-files=without-match -F "$marker" .output >/dev/null 2>&1; then
    echo "CI-only hosted transport shim marker leaked into pilot-rc artifact: $marker" >&2
    exit 1
  fi
done

for public_marker in \
  'VITE_GATE1_TEST_OPERATIONS' \
  'VITE_V0_ERROR_BOUNDARY_TEST' \
  '__v0_error_boundary_probe' \
  'PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY' \
  'PILOT_OPERATOR_SUPABASE_URL' \
  'register_sanitized_listing_photo' \
  'get_listing_photo_inventory' \
  'Pending ilan ve fotoğrafı kaydet' \
  'Kurucu pilot işlemleri' \
  'V0 test sürümü' \
  'İlanlar örnektir' \
  'Demo ilan oluşturma' \
  'Giriş demosu'; do
  if grep -R --binary-files=without-match -F "$public_marker" .output/public >/dev/null 2>&1; then
    echo "pilot-rc public artifact contains test/demo/privileged residue: $public_marker" >&2
    exit 1
  fi
done

for secret_name in \
  MANAGED_SUPABASE_DB_URL \
  MANAGED_SUPABASE_S3_ACCESS_KEY_ID \
  MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY; do
  secret_value="${!secret_name:-}"
  if [[ -n "$secret_value" ]] && grep -R --binary-files=without-match -F "$secret_value" .output >/dev/null 2>&1; then
    echo "pilot-rc artifact contains secret value from $secret_name." >&2
    exit 1
  fi
done

echo "pilot-rc artifact boundary passed: no CI shim, test/demo public residue, privileged marker, or supplied secret leakage."
