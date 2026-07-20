$ErrorActionPreference = "Stop"
$agents = Join-Path (Get-Location) "AGENTS.md"
$source = Join-Path (Get-Location) ".genlayer-codex-kit\sources\AGENTS.dropin.md"
if (-not (Test-Path $source)) { throw "Extract all parts first." }
if (Test-Path $agents) { $stamp=Get-Date -Format "yyyyMMdd-HHmmss"; Copy-Item $agents "$agents.backup-$stamp"; $t=Get-Content $agents -Raw; if ($t -notmatch "GenLayer Codex Kit v3") { Add-Content $agents "`n`n"; Add-Content $agents (Get-Content $source -Raw) } } else { Copy-Item $source $agents }
Write-Host "AGENTS.md ready."
