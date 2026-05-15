# ---------------------------------------------------------------------
# Samwin Infotech - Rebuild Frontend and Restart Backend
#
# After making code changes, run this to:
#   1. Rebuild the React frontend
#   2. Restart the PM2 backend process so changes are live
#
# Run:
#     .\restart-server.ps1
# ---------------------------------------------------------------------

$ErrorActionPreference = 'Continue'
$repoPath = $PSScriptRoot
$processName = 'samwin'

function Step($msg) { Write-Host "`n[$(Get-Date -Format HH:mm:ss)] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Set-Location $repoPath
Write-Host "Samwin Infotech - Restart Server" -ForegroundColor Magenta

# 1. Build the frontend
Step 'Building frontend...'
Set-Location "$repoPath\client"
& npx vite build | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Frontend build failed' }
Ok 'Frontend rebuilt'

# 2. Restart PM2 (or start if not running)
Step "Restarting PM2 process '$processName'..."
Set-Location "$repoPath\server"
$listOut = & pm2 jlist 2>&1 | Out-String
if ($listOut -match $processName) {
    & pm2 restart $processName | Out-Null
    Ok "PM2 process '$processName' restarted"
} else {
    & pm2 start src/server.js --name $processName | Out-Null
    & pm2 save | Out-Null
    Ok "PM2 process '$processName' started (was not running)"
}

# 3. Verify
Step 'Verifying website...'
Start-Sleep -Seconds 4
try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -eq 200) { Ok 'Backend responding on port 5000' }
} catch {
    Fail 'Backend not responding. Check: pm2 logs samwin'
}

Set-Location $repoPath
Write-Host "`nReady at http://localhost:5000" -ForegroundColor Green
