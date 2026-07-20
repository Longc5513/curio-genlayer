param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git")) {
  git init
}

git add .
$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "feat: launch Curio learning bounties on GenLayer"
}

git branch -M $Branch
$origin = git remote 2>$null | Select-String -SimpleMatch "origin"
if ($origin) {
  git remote set-url origin $RepoUrl
} else {
  git remote add origin $RepoUrl
}

git push -u origin $Branch
