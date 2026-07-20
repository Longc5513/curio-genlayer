#!/usr/bin/env bash
set -euo pipefail
s=.genlayer-codex-kit/sources/AGENTS.dropin.md
[[ -f "$s" ]] || { echo "Extract all parts first" >&2; exit 1; }
if [[ -f AGENTS.md ]]; then d=$(date +%Y%m%d-%H%M%S); cp AGENTS.md "AGENTS.md.backup-$d"; grep -q "GenLayer Codex Kit v3" AGENTS.md || { printf "\n\n" >> AGENTS.md; cat "$s" >> AGENTS.md; }; else cp "$s" AGENTS.md; fi
echo "AGENTS.md ready."
