#!/usr/bin/env bash
set -euo pipefail

[[ "${ARAR_BUILD_PROFILE:-}" == "pilot-rc" ]] || exit 0

marker='V0 test sürümü'
matches="$(grep -RIl --binary-files=without-match -F "$marker" .output/public || true)"
if [[ -z "$matches" ]]; then
  echo "pilot artifact diagnostic: forbidden literal absent after build."
  exit 0
fi

printf 'PILOT_RESIDUE_FILES_BEGIN\n%s\nPILOT_RESIDUE_FILES_END\n' "$matches"
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  echo "--- forbidden literal context: $file ---"
  python3 - "$file" "$marker" <<'PY'
import sys
from pathlib import Path
path = Path(sys.argv[1])
marker = sys.argv[2]
text = path.read_text(encoding="utf-8", errors="replace")
pos = text.find(marker)
if pos < 0:
    raise SystemExit(0)
start = max(0, pos - 700)
end = min(len(text), pos + len(marker) + 700)
print(text[start:end])
PY
done <<< "$matches"

echo '--- checked-out source modules containing exact literal ---'
grep -RIn --binary-files=without-match -F "$marker" src || true

echo '--- emitted V0 mock listing image assets ---'
find .output/public/assets -maxdepth 1 -type f -name 'ilan-*.jpg' -print | sort || true

# This is diagnostics only; the existing hosted scanner remains the authority and will still fail closed.
