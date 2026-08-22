#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
bucket="${STORAGE_BUCKET:-listing_photos}"
backup_dir="${STORAGE_BACKUP_DIR:-}"

if [[ "$bucket" != "listing_photos" ]]; then
  echo "Only the canonical listing_photos bucket is supported by this pilot script." >&2
  exit 1
fi
if [[ -z "$backup_dir" ]]; then
  echo "STORAGE_BACKUP_DIR is required." >&2
  exit 1
fi
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is required." >&2
  exit 1
fi
if ! command -v sha256sum >/dev/null 2>&1; then
  echo "sha256sum is required." >&2
  exit 1
fi

require_source() {
  : "${SOURCE_S3_ENDPOINT:?SOURCE_S3_ENDPOINT is required}"
  : "${SOURCE_S3_REGION:?SOURCE_S3_REGION is required}"
  : "${SOURCE_S3_ACCESS_KEY_ID:?SOURCE_S3_ACCESS_KEY_ID is required}"
  : "${SOURCE_S3_SECRET_ACCESS_KEY:?SOURCE_S3_SECRET_ACCESS_KEY is required}"

  export RCLONE_CONFIG_SOURCE_TYPE=s3
  export RCLONE_CONFIG_SOURCE_PROVIDER=Other
  export RCLONE_CONFIG_SOURCE_ENDPOINT="$SOURCE_S3_ENDPOINT"
  export RCLONE_CONFIG_SOURCE_REGION="$SOURCE_S3_REGION"
  export RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID="$SOURCE_S3_ACCESS_KEY_ID"
  export RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY="$SOURCE_S3_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_SOURCE_FORCE_PATH_STYLE=true
}

require_target() {
  : "${TARGET_S3_ENDPOINT:?TARGET_S3_ENDPOINT is required}"
  : "${TARGET_S3_REGION:?TARGET_S3_REGION is required}"
  : "${TARGET_S3_ACCESS_KEY_ID:?TARGET_S3_ACCESS_KEY_ID is required}"
  : "${TARGET_S3_SECRET_ACCESS_KEY:?TARGET_S3_SECRET_ACCESS_KEY is required}"

  export RCLONE_CONFIG_TARGET_TYPE=s3
  export RCLONE_CONFIG_TARGET_PROVIDER=Other
  export RCLONE_CONFIG_TARGET_ENDPOINT="$TARGET_S3_ENDPOINT"
  export RCLONE_CONFIG_TARGET_REGION="$TARGET_S3_REGION"
  export RCLONE_CONFIG_TARGET_ACCESS_KEY_ID="$TARGET_S3_ACCESS_KEY_ID"
  export RCLONE_CONFIG_TARGET_SECRET_ACCESS_KEY="$TARGET_S3_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_TARGET_FORCE_PATH_STYLE=true
}

write_local_manifest() {
  local objects_dir="$backup_dir/objects"
  (
    cd "$objects_dir"
    find . -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum
  ) > "$backup_dir/sha256sums.txt"
}

verify_local_manifest() {
  local objects_dir="$backup_dir/objects"
  if [[ ! -f "$backup_dir/sha256sums.txt" ]]; then
    echo "Storage backup checksum manifest is missing." >&2
    exit 1
  fi
  (
    cd "$objects_dir"
    sha256sum --check --strict ../sha256sums.txt
  )
}

compare_size_json() {
  local expected_file="$1"
  local actual_file="$2"
  python3 - "$expected_file" "$actual_file" <<'PY'
import json
import sys
from pathlib import Path

expected = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
actual = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
for key in ("count", "bytes"):
    if int(expected.get(key, -1)) != int(actual.get(key, -2)):
        raise SystemExit(
            f"Storage size mismatch for {key}: source={expected.get(key)} target={actual.get(key)}"
        )
print(
    f"Storage size verified: {expected.get('count')} object(s), {expected.get('bytes')} byte(s)."
)
PY
}

case "$mode" in
  backup)
    require_source
    rm -rf "$backup_dir"
    mkdir -p "$backup_dir/objects"

    rclone size "source:${bucket}" --json > "$backup_dir/source-size.json"
    rclone copy "source:${bucket}" "$backup_dir/objects" \
      --checkers 4 \
      --transfers 2
    write_local_manifest
    verify_local_manifest

    python3 - "$backup_dir/source-size.json" "$backup_dir/objects" <<'PY'
import json
import sys
from pathlib import Path

summary = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
root = Path(sys.argv[2])
files = [path for path in root.rglob("*") if path.is_file()]
count = len(files)
size = sum(path.stat().st_size for path in files)
if count != int(summary.get("count", -1)) or size != int(summary.get("bytes", -1)):
    raise SystemExit(
        f"Local Storage backup does not match source: source=({summary.get('count')}, {summary.get('bytes')}) local=({count}, {size})"
    )
print(f"Storage backup verified locally: {count} object(s), {size} byte(s).")
PY
    ;;

  restore)
    require_target
    verify_local_manifest
    if [[ ! -f "$backup_dir/source-size.json" ]]; then
      echo "Storage source-size manifest is missing." >&2
      exit 1
    fi

    rclone copy "$backup_dir/objects" "target:${bucket}" \
      --immutable \
      --checkers 4 \
      --transfers 2
    rclone check "$backup_dir/objects" "target:${bucket}" --download --one-way
    rclone size "target:${bucket}" --json > "$backup_dir/target-size.json"
    compare_size_json "$backup_dir/source-size.json" "$backup_dir/target-size.json"
    ;;

  verify-source-target)
    require_source
    require_target
    rclone check "source:${bucket}" "target:${bucket}" --download --one-way
    rclone size "source:${bucket}" --json > "$backup_dir/verify-source-size.json"
    rclone size "target:${bucket}" --json > "$backup_dir/verify-target-size.json"
    compare_size_json "$backup_dir/verify-source-size.json" "$backup_dir/verify-target-size.json"
    ;;

  *)
    echo "Usage: $0 {backup|restore|verify-source-target}" >&2
    exit 2
    ;;
esac
