# ---------------------------------------------------------------------
# Samwin Infotech - One-Time PM2 Setup
#
# Runs the backend as a Windows background service via PM2.
# After running this, the website stays up even when VS Code is closed
# and auto-starts on PC reboot.
#
# Run ONCE per machine:
#     .\setup-pm2.ps1
#
# Open in browser:  http://localhost:5000
# Login: admin / admin
# ---------------------------------------------------------------------

$ErrorActionPreference = 'Continue'
$repoPath = $PSScriptRoot
$processName = 'samwin'

function Step($msg) { Write-Host "`n[$(Get-Date -Format HH:mm:ss)] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host "Samwin Infotech - PM2 Setup" -ForegroundColor Magenta
Write-Host "Repo: $repoPath" -ForegroundColor DarkGray

# 1. Verify Node is installed
Step 'Checking Node.js...'
$nodeVer = & node --version 2>&1
if ($LASTEXITCODE -ne 0) { Fail 'Node.js is not installed. Install from https://nodejs.org' }
Ok "Node $nodeVer"

# 2. Install PM2 if missing
Step 'Checking PM2...'
$pm2Ver = & pm2 --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host '  PM2 not found. Installing globally...' -ForegroundColor Yellow
    & npm install -g pm2 | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail 'Failed to install PM2' }
    $pm2Ver = & pm2 --version 2>&1
}
Ok "PM2 $pm2Ver"

# 3. Install pm2-windows-startup if missing
Step 'Checking pm2-windows-startup...'
& pm2-startup 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0 -and -not (Get-Command pm2-startup -ErrorAction SilentlyContinue)) {
    Write-Host '  Installing pm2-windows-startup...' -ForegroundColor Yellow
    & npm install -g pm2-windows-startup | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail 'Failed to install pm2-windows-startup' }
}
Ok 'pm2-windows-startup available'

# 4. Install server dependencies if missing
Step 'Checking server dependencies...'
if (-not (Test-Path "$repoPath\server\node_modules")) {
    Write-Host '  Running npm install in server/...' -ForegroundColor Yellow
    Set-Location "$repoPath\server"
    & npm install | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail 'npm install (server) failed' }
}
Ok 'Server dependencies present'

# 5. Install client dependencies if missing
Step 'Checking client dependencies...'
if (-not (Test-Path "$repoPath\client\node_modules")) {
    Write-Host '  Running npm install in client/...' -ForegroundColor Yellow
    Set-Location "$repoPath\client"
    & npm install | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail 'npm install (client) failed' }
}
Ok 'Client dependencies present'

# 6. Build the frontend
Step 'Building frontend for production...'
Set-Location "$repoPath\client"
& npx vite build | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Frontend build failed' }
Ok 'Frontend built (client/dist/)'

# 7. Verify .env exists
Set-Location $repoPath
if (-not (Test-Path "$repoPath\server\.env")) {
    Warn '.env file missing in server/. Creating default...'
    @"
PORT=5000
MONGODB_URI=mongodb://localhost:27017/insurance-tracker
JWT_SECRET=samwin-insurance-tracker-jwt-secret-2024
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
"@ | Out-File -FilePath "$repoPath\server\.env" -Encoding ASCII
    Ok '.env created with defaults'
} else {
    Ok '.env present'
}

# 8. Stop existing samwin process if running
Step "Setting up PM2 process '$processName'..."
& pm2 delete $processName 2>&1 | Out-Null
Set-Location "$repoPath\server"
& pm2 start src/server.js --name $processName | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "Failed to start PM2 process '$processName'" }
Ok "PM2 process '$processName' started"

# 9. Save process list so it resurrects on boot
Step 'Saving PM2 process list...'
& pm2 save | Out-Null
Ok 'Process list saved'

# 10. Install Windows startup entry
Step 'Configuring auto-start on boot...'
& pm2-startup install | Out-Null
if ($LASTEXITCODE -ne 0) { Warn 'pm2-startup install returned non-zero (may already be installed)' }
Ok 'Auto-start configured'

# 11. Verify the site is responding
Step 'Verifying website...'
Start-Sleep -Seconds 2
try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -eq 200) { Ok 'Backend API responding on port 5000' }
} catch {
    Warn 'Could not reach http://localhost:5000/api/health — check `pm2 logs samwin`'
}

Set-Location $repoPath

Write-Host "`n=========================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  Website: http://localhost:5000" -ForegroundColor White
Write-Host "  Login:   admin / admin" -ForegroundColor White
Write-Host ""
Write-Host "  Daily commands:" -ForegroundColor DarkGray
Write-Host "    pm2 status            - check if running" -ForegroundColor DarkGray
Write-Host "    pm2 logs samwin       - view live logs" -ForegroundColor DarkGray
Write-Host "    .\restart-server.ps1  - rebuild + restart after code changes" -ForegroundColor DarkGray
Write-Host ""
