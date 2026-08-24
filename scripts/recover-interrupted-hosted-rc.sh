#!/usr/bin/env bash
set -euo pipefail

: "${MANAGED_SUPABASE_PROJECT_REF:?required}"
: "${MANAGED_SUPABASE_DB_URL:?required}"
: "${MANAGED_SUPABASE_S3_ENDPOINT:?required}"
: "${MANAGED_SUPABASE_S3_REGION:?required}"
: "${MANAGED_SUPABASE_S3_ACCESS_KEY_ID:?required}"
: "${MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY:?required}"

approved_ref="rzosrvenlvhijeckmwyc"
residual_listing_id="6e974db7-aad1-4062-845b-d1a7fbf12691"
residual_photo_id="d0e21aa9-404f-4f6f-922a-6fdb56598e0f"
residual_object_path="listings/${residual_listing_id}/${residual_photo_id}.webp"

if [[ "$MANAGED_SUPABASE_PROJECT_REF" != "$approved_ref" ]]; then
  echo "Interrupted RC recovery refused a non-dedicated project ref." >&2
  exit 1
fi
case "$MANAGED_SUPABASE_S3_ENDPOINT" in
  "https://${approved_ref}.supabase.co/storage/v1/s3"|"https://${approved_ref}.storage.supabase.co/storage/v1/s3") ;;
  *) echo "Interrupted RC recovery refused an S3 endpoint outside the dedicated project." >&2; exit 1 ;;
esac

managed_scalar() {
  PGSSLMODE=require psql "$MANAGED_SUPABASE_DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 -c "$1"
}

row_count="$(managed_scalar "
  select count(*)
  from public.listings
  where id = '${residual_listing_id}'::uuid;
")"
if [[ "$row_count" == "1" ]]; then
  marker_match="$(managed_scalar "
    select count(*)
    from public.listings
    where id = '${residual_listing_id}'::uuid
      and seller_display_name = 'Hosted RC Sentetik Satıcı'
      and title = 'Hosted RC yayın yaşam döngüsü ilanı'
      and contact_e164 = '+12025550155';
  ")"
  if [[ "$marker_match" != "1" ]]; then
    echo "Interrupted RC recovery found the historical UUID with unexpected data; refusing deletion." >&2
    exit 1
  fi
elif [[ "$row_count" != "0" ]]; then
  echo "Interrupted RC recovery found an impossible listing cardinality." >&2
  exit 1
fi

export RCLONE_CONFIG_SOURCE_TYPE=s3
export RCLONE_CONFIG_SOURCE_PROVIDER=Other
export RCLONE_CONFIG_SOURCE_ENDPOINT="$MANAGED_SUPABASE_S3_ENDPOINT"
export RCLONE_CONFIG_SOURCE_REGION="$MANAGED_SUPABASE_S3_REGION"
export RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID="$MANAGED_SUPABASE_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY="$MANAGED_SUPABASE_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_SOURCE_FORCE_PATH_STYLE=true

parent_path="${residual_object_path%/*}"
object_name="${residual_object_path##*/}"
if rclone lsf "source:listing_photos/${parent_path}" --files-only 2>/dev/null | grep -Fxq "$object_name"; then
  rclone deletefile "source:listing_photos/${residual_object_path}"
fi
if rclone lsf "source:listing_photos/${parent_path}" --files-only 2>/dev/null | grep -Fxq "$object_name"; then
  echo "Interrupted RC recovery could not remove the exact historical Storage object." >&2
  exit 1
fi

if [[ "$row_count" == "1" ]]; then
  PGSSLMODE=require psql "$MANAGED_SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "
    delete from public.listings
    where id = '${residual_listing_id}'::uuid
      and seller_display_name = 'Hosted RC Sentetik Satıcı'
      and title = 'Hosted RC yayın yaşam döngüsü ilanı'
      and contact_e164 = '+12025550155';
  " >/dev/null
fi

if [[ "$(managed_scalar "select count(*) from public.listings where id = '${residual_listing_id}'::uuid;")" != "0" ]]; then
  echo "Interrupted RC recovery left the historical listing row." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from private.listing_photos where listing_id = '${residual_listing_id}'::uuid or id = '${residual_photo_id}'::uuid;")" != "0" ]]; then
  echo "Interrupted RC recovery left historical private photo metadata." >&2
  exit 1
fi
if [[ "$(managed_scalar "select count(*) from storage.objects where bucket_id = 'listing_photos' and name = '${residual_object_path}';")" != "0" ]]; then
  echo "Interrupted RC recovery left the historical Storage metadata row." >&2
  exit 1
fi

echo "Historical interrupted hosted RC residue is absent."
