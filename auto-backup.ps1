# ---------------------------------------------------------------------
# Samwin Infotech - Auto Backup and Push to GitHub
#
# Exports the MongoDB database and pushes the backup folder to GitHub.
# Code changes are NOT auto-committed (commit those manually with proper
# messages). This script only commits the new backup_<timestamp>/ folder.
#
# Run manually:
#     .\auto-backup.ps1
#
# Schedule via Windows Task Scheduler - see SETUP-AUTO-BACKUP.md
# ---------------------------------------------------------------------

# Don't stop on warnings written to stderr (git uses stderr for non-error info)
$ErrorActionPreference = 'Continue'
$repoPath = $PSScriptRoot

function Step($msg) { Write-Host "`n[$(Get-Date -Format HH:mm:ss)] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Set-Location $repoPath
Write-Host "Samwin Infotech - Auto Backup" -ForegroundColor Magenta
Write-Host "Repo: $repoPath" -ForegroundColor DarkGray

# 1. Sync with remote first (before creating new backup folder)
Step 'Pulling latest changes from GitHub...'
# --autostash auto-stashes any local changes and restores them after rebase
& git pull --rebase --autostash | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'git pull failed. Resolve conflicts manually then retry.' }
Ok 'In sync with origin/main'

# 2. Export DB
Step 'Exporting database from MongoDB...'
Set-Location "$repoPath\server"
& node src/seeds/exportData.js | Tee-Object -Variable exportOutput | Out-Null
if ($LASTEXITCODE -ne 0) {
    $exportOutput | ForEach-Object { Write-Host $_ }
    Fail 'Database export failed. Is MongoDB running?'
}
$totalLine = $exportOutput | Where-Object { $_ -like '*Total:*' } | Select-Object -First 1
if ($totalLine) { Ok $totalLine.Trim() } else { Ok 'Export complete' }
Set-Location $repoPath

# 3. Stage only backup folders (NOT code changes)
Step 'Staging backup folders...'
& git add "backup_*" | Out-Null
$staged = & git diff --cached --name-only
if (-not $staged) {
    Warn 'No new backup folder to commit. Nothing to push.'
    exit 0
}
$count = ($staged | Measure-Object).Count
Ok "$count file(s) staged"

# 4. Commit
Step 'Creating commit...'
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
& git commit -m "Auto DB backup $timestamp" --no-verify | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'git commit failed' }
Ok "Committed: 'Auto DB backup $timestamp'"

# 5. Push
Step 'Pushing to GitHub...'
& git push | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'git push failed. Check your network and GitHub credentials.' }
Ok 'Pushed to origin/main'

Write-Host "`nBackup complete." -ForegroundColor Green
