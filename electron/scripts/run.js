// Runs a local CLI tool (electron, electron-builder) with ELECTRON_RUN_AS_NODE
// stripped from the environment. That variable is set by some parent dev
// environments and forces electron.exe to behave as a plain Node binary
// instead of launching the actual Electron runtime.
const { spawnSync } = require('child_process');
const path = require('path');

const [, , binName, ...args] = process.argv;

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const binPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? `${binName}.cmd` : binName
);

const result = spawnSync(binPath, args, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
if (result.error) {
  console.error('run.js failed to spawn', binPath, result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
