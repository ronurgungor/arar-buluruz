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
  'PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY' \
  'PILOT_SUBMISSION_CAPABILITY_SECRET' \
  'register_sanitized_listing_photo' \
  'get_listing_photo_inventory' \
  'Kurucu pilot işlemleri' \
  'V0 test sürümü' \
  'İlanlar örnektir' \
  'Demo ilan oluşturma' \
  'Giriş demosu' \
  'Pilot release candidate' \
  'yalnız sentetik test verisi' \
  'gerçek veri girişi kapalıdır' \
  'Bu geliştirme ortamında'; do
  if grep -R --binary-files=without-match -F "$public_marker" .output/public >/dev/null 2>&1; then
    echo "pilot-rc public artifact contains test/demo/privileged residue: $public_marker" >&2
    exit 1
  fi
done

# WhatsApp is allowed only as a buyer -> seller public listing contact action.
# The superseded founder/WhatsApp intake path must not return.
if git grep -nE 'VITE_PILOT_INTAKE_E164|buildPilotIntakeWhatsAppHref|Kurucuyu ara|Telefonla başvur|WhatsApp ile başvur' -- src/routes-pilot src/build-profiles/pilot; then
  echo "Superseded founder/WhatsApp listing-intake path returned to the Stage-1 pilot graph." >&2
  exit 1
fi

if find .output/public/assets -maxdepth 1 -type f -name 'ilan-*.jpg' -print -quit | grep -q .; then
  echo "pilot-rc public artifact contains V0 mock listing image assets." >&2
  find .output/public/assets -maxdepth 1 -type f -name 'ilan-*.jpg' -print >&2
  exit 1
fi

for secret_name in \
  MANAGED_SUPABASE_DB_URL \
  MANAGED_SUPABASE_S3_ACCESS_KEY_ID \
  MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY \
  PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY \
  PILOT_SUBMISSION_CAPABILITY_SECRET; do
  secret_value="${!secret_name:-}"
  if [[ -n "$secret_value" ]] && grep -R --binary-files=without-match -F "$secret_value" .output >/dev/null 2>&1; then
    echo "pilot-rc artifact contains secret value from $secret_name." >&2
    exit 1
  fi
done

echo "pilot-rc artifact boundary passed: no CI shim, V0/mock/test presentation residue, founder-intake path, privileged marker, or supplied secret leakage."