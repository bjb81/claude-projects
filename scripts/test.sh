#!/usr/bin/env bash
# Run tests for every project, or one project: bash scripts/test.sh [slug]
set -uo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
if [ $# -gt 0 ]; then dirs=("projects/$1"); else dirs=(projects/*/); fi
if [ ${#dirs[@]} -eq 0 ]; then echo "No projects yet. Nothing to test."; exit 0; fi
failed=()
ran=0

for d in "${dirs[@]}"; do
  d="${d%/}"
  [ -d "$d" ] || { echo "No such project: $d"; exit 1; }
  name="$(basename "$d")"
  if [ -f "$d/package.json" ]; then
    echo "=== $name (npm test) ==="
    ran=$((ran+1))
    ( cd "$d" && { [ -d node_modules ] || npm ci --no-audit --no-fund || npm install --no-audit --no-fund; } && npm test ) || failed+=("$name")
  elif [ -d "$d/tests" ] && ls "$d"/tests/*.py >/dev/null 2>&1; then
    echo "=== $name (pytest) ==="
    ran=$((ran+1))
    ( cd "$d" && { [ ! -f requirements.txt ] || python3 -m pip install -q -r requirements.txt --break-system-packages 2>/dev/null || python3 -m pip install -q -r requirements.txt; } && python3 -m pytest -q ) || failed+=("$name")
  else
    echo "=== $name (no tests found) ==="
    failed+=("$name: no tests")
  fi
done

echo
if [ ${#failed[@]} -eq 0 ]; then
  echo "ALL TESTS PASSED ($ran project(s))"
else
  echo "FAILED: ${failed[*]}"
  exit 1
fi
