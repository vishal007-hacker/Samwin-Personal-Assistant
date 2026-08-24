const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

// Go up to the root project directory (since this is in server/src/controllers)
const projectRoot = path.join(__dirname, '../../..');

// This git-based checker only makes sense when the server is running from a
// live git checkout (dev machine, or a source-based PM2 deployment). The
// packaged desktop app ships `server/` as plain copied files with no `.git`
// anywhere in its ancestry — that build gets its updates from GitHub
// Releases via electron-updater instead, so this endpoint should report
// "not applicable" there rather than surface a raw git error.
async function isGitCheckout() {
  try {
    await execPromise('git rev-parse --is-inside-work-tree', { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

exports.checkUpdate = async (req, res, next) => {
  try {
    if (!(await isGitCheckout())) {
      return res.json({
        success: true,
        updateAvailable: false,
        commitsBehind: 0,
        gitAvailable: false,
        message: 'This installation is a packaged desktop app — it updates automatically via GitHub Releases, not git.',
      });
    }

    // Fetch latest from remote
    await execPromise('git fetch', { cwd: projectRoot });

    // Check how many commits we are behind origin/main
    const { stdout } = await execPromise('git rev-list HEAD..origin/main --count', { cwd: projectRoot });
    const count = parseInt(stdout.trim(), 10) || 0;

    res.json({
      success: true,
      updateAvailable: count > 0,
      commitsBehind: count,
      gitAvailable: true,
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    next(new Error('Failed to check for updates: ' + error.message));
  }
};

exports.applyUpdate = async (req, res, next) => {
  try {
    if (!(await isGitCheckout())) {
      return res.status(400).json({
        success: false,
        message: 'This installation is a packaged desktop app — updates are delivered automatically via GitHub Releases, not git.',
      });
    }

    // Pull the latest changes
    const { stdout } = await execPromise('git pull origin main', { cwd: projectRoot });

    res.json({
      success: true,
      message: 'Update applied successfully. The application may need a restart.',
      output: stdout
    });

    // Try to restart via PM2 (fire and forget)
    // If they aren't using PM2, this will just silently fail which is fine.
    setTimeout(() => {
      exec('pm2 restart samwin', (err) => {
        if (err) console.error('Failed to auto-restart via PM2 (maybe not installed or running):', err.message);
      });
    }, 2000);

  } catch (error) {
    console.error('Error applying update:', error);
    next(new Error('Failed to apply update: ' + error.message));
  }
};
