#!/usr/bin/env bash
# Print the next unused test port (4201, 4202, ...) across all projects.
cd "$(dirname "$0")/.."
max=4200
for f in projects/*/playwright.config.*; do
  [ -f "$f" ] || continue
  for p in $(grep -oE 'localhost:[0-9]+' "$f" | cut -d: -f2); do
    [ "$p" -gt "$max" ] && max=$p
  done
done
echo $((max + 1))
