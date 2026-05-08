# Auto Backup Setup

The `auto-backup.ps1` script exports your MongoDB database and pushes the new backup folder to GitHub automatically.

## What it does

1. Pulls the latest from GitHub (`git pull --rebase`)
2. Exports MongoDB to `backup_<timestamp>/`
3. Stages **only** the new backup folder (your code changes are NOT auto-committed)
4. Commits with message `Auto DB backup <date> <time>`
5. Pushes to `origin/main`

If MongoDB isn't running, the script exits with `[FAIL]` and pushes nothing.
If there's no new data to back up, it exits cleanly without committing.

## Run it manually

Open PowerShell in the project folder:

```powershell
cd "E:\Samwin\Personal Assistant"
.\auto-backup.ps1
```

If you get *"running scripts is disabled on this system"*, run this once (only needed once per user):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Schedule it daily (Windows Task Scheduler)

### Option 1: One-line setup (creates task at 11:00 PM daily)

Run this once in **PowerShell as Administrator**:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"E:\Samwin\Personal Assistant\auto-backup.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 11:00PM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Samwin DB Auto Backup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily MongoDB backup pushed to GitHub"
```

To run a different time (e.g., 6:30 PM), change `11:00PM` to `6:30PM`.

### Option 2: Manual setup via Task Scheduler GUI

1. Open **Task Scheduler** (Win + R, type `taskschd.msc`)
2. Click **Create Basic Task**
3. **Name:** `Samwin DB Auto Backup`
4. **Trigger:** Daily, time of your choice
5. **Action:** Start a program
   - **Program:** `powershell.exe`
   - **Arguments:** `-NoProfile -ExecutionPolicy Bypass -File "E:\Samwin\Personal Assistant\auto-backup.ps1"`
6. Finish

### Test the scheduled task immediately

```powershell
Start-ScheduledTask -TaskName "Samwin DB Auto Backup"
Get-ScheduledTaskInfo -TaskName "Samwin DB Auto Backup"
```

### Remove the scheduled task

```powershell
Unregister-ScheduledTask -TaskName "Samwin DB Auto Backup" -Confirm:$false
```

## Requirements

- **Git credentials cached** — first manual `git push` should be done in a terminal so the credentials are stored. After that, the script can push without prompting. If you use HTTPS with GitHub, install [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager) (it's bundled with Git for Windows).
- **MongoDB running** as a service so it's available even without an interactive session.
- **Node.js** in PATH (open a new PowerShell and run `node --version` to verify).

## What is NOT auto-pushed

- Your **code changes** (those need a meaningful commit message — commit those manually)
- The `Test.md` file, `.claude/`, `server/uploads/`, anything in `.gitignore`

## What if I want to push code too?

Don't auto-commit code. Instead, commit your code manually with a descriptive message before letting the auto-backup run:

```powershell
git add <your-changed-files>
git commit -m "your feature description"
git push
# Then either run auto-backup.ps1 or wait for the scheduled task
```

## Logs

Task Scheduler keeps run history. To see it:

```powershell
Get-ScheduledTaskInfo -TaskName "Samwin DB Auto Backup"
```

Or open Task Scheduler GUI → click the task → **History** tab.
