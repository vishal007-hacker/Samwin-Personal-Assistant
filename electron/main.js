const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const PORT = process.env.PORT || 5000;
const SERVER_URL = `http://localhost:${PORT}`;

const serverDir = app.isPackaged
  ? path.join(process.resourcesPath, 'server')
  : path.join(__dirname, '..', 'server');

let serverProcess = null;
let mainWindow = null;

function startServer() {
  serverProcess = spawn(process.execPath, [path.join(serverDir, 'src', 'server.js')], {
    cwd: serverDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(PORT) },
    windowsHide: true,
  });

  serverProcess.stdout.on('data', (data) => console.log(`[server] ${data}`.trim()));
  serverProcess.stderr.on('data', (data) => console.error(`[server] ${data}`.trim()));
  serverProcess.on('exit', (code) => {
    console.log(`[server] exited with code ${code}`);
    serverProcess = null;
  });
}

function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`${SERVER_URL}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'));
      setTimeout(tryOnce, 400);
    };
    tryOnce();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    title: 'Samwin Infotech',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  try {
    await waitForServer();
    await mainWindow.loadURL(SERVER_URL);
  } catch (err) {
    dialog.showErrorBox(
      'Samwin Infotech — Startup Error',
      `The local server did not start correctly.\n\n${err.message}\n\nMake sure PostgreSQL is installed and running, then restart the app.`
    );
    app.quit();
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return; // no update feed available in dev mode

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err.message);
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] update available: v${info.version}`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready — Samwin Infotech',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'Restart now to install the update, or it will install automatically the next time you close the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] check failed:', err.message);
  });

  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] check failed:', err.message);
    });
  }, UPDATE_CHECK_INTERVAL_MS);
}

app.whenReady().then(() => {
  startServer();
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
