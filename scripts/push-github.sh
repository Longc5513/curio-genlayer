#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/push-github.sh <github-repository-url> [branch]" >&2
  echo "Example: ./scripts/push-github.sh https://github.com/USERNAME/curio-genlayer.git main" >&2
  exit 1
fi

repo_url="$1"
branch="${2:-main}"

if [[ ! -d .git ]]; then
  git init
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "feat: launch Curio learning bounties on GenLayer"
fi

git branch -M "$branch"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$repo_url"
else
  git remote add origin "$repo_url"
fi

git push -u origin "$branch"
