#!/usr/bin/env bash
# Install dependencies for every project. Safe to run repeatedly.
# Runs automatically at the start of each Claude session (see .claude/settings.json).
set -uo pipefail
cd "$(dirname "$0")/.."

for d in projects/*/; do
  d="${d%/}"
  if [ -f "$d/package.json" ] && [ ! -d "$d/node_modules" ]; then
    ( cd "$d" && { npm ci --no-audit --no-fund --silent || npm install --no-audit --no-fund --silent; } ) >/dev/null 2>&1 \
      && echo "installed: $d" || echo "install failed (will retry during tests): $d"
  fi
  if [ -f "$d/requirements.txt" ]; then
    python3 -m pip install -q -r "$d/requirements.txt" --break-system-packages >/dev/null 2>&1 \
      || python3 -m pip install -q -r "$d/requirements.txt" >/dev/null 2>&1 || true
  fi
done
python3 -m pytest --version >/dev/null 2>&1 || python3 -m pip install -q pytest --break-system-packages >/dev/null 2>&1 || true
exit 0
