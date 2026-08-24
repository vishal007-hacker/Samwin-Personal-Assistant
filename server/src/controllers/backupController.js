const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const archiver = require('archiver');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');

function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 60000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve((stdout || '').trim());
    });
  });
}

// All Prisma model delegates to export. Order is parent-first — restore does
// a full delete pass in reverse (children before parents) then a full create
// pass in this order, since a single interleaved pass can satisfy neither.
const MODEL_MAP = [
  { name: 'users', delegate: 'user' },
  { name: 'deviceTypes', delegate: 'deviceType' },
  { name: 'expenseCategories', delegate: 'expenseCategory' },
  { name: 'insuranceTypes', delegate: 'insuranceType' },
  { name: 'salesCategories', delegate: 'salesCategory' },
  { name: 'serviceTypes', delegate: 'serviceType' },
  { name: 'customers', delegate: 'customer' },
  { name: 'schemes', delegate: 'scheme' },
  { name: 'employees', delegate: 'employee' },
  { name: 'maintenanceProducts', delegate: 'maintenanceProduct' },
  { name: 'accounts', delegate: 'account' },
  { name: 'lms', delegate: 'lMS' },
  { name: 'customReminders', delegate: 'customReminder' },
  { name: 'posters', delegate: 'poster' },
  { name: 'luckyDrawParticipants', delegate: 'luckyDrawParticipant' },
  { name: 'stocks', delegate: 'stock' },
  { name: 'deviceServices', delegate: 'deviceService' },
  { name: 'expenses', delegate: 'expense' },
  { name: 'billings', delegate: 'billing' },
  { name: 'accountSnapshots', delegate: 'accountSnapshot' },
  { name: 'policies', delegate: 'policy' },
  { name: 'vehicleInsurances', delegate: 'vehicleInsurance' },
  { name: 'services', delegate: 'service' },
  { name: 'credits', delegate: 'credit' },
  { name: 'attendances', delegate: 'attendance' },
  { name: 'maintenanceRecords', delegate: 'maintenanceRecord' },
  { name: 'sales', delegate: 'sale' },
  { name: 'payments', delegate: 'payment' },
  { name: 'notifications', delegate: 'notification' },
];

// Convert a persisted row (Mongoose-style) into the Prisma field shape:
// _id -> id, __v dropped, ref ObjectIds -> *Id scalars. Embedded object refs
// (e.g. Billing.customer) are kept as-is (Json column).
function toPrismaShape(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const {
    _id, __v,
    createdBy, recordedBy,
    customer, policy, scheme, employee, product,
    ...rest
  } = doc;
  const out = { ...rest };
  if (_id) out.id = _id;
  if (createdBy) out.createdById = createdBy;
  if (recordedBy) out.recordedById = recordedBy;
  if (typeof customer === 'string') out.customerId = customer;
  else if (customer && typeof customer === 'object') out.customer = customer;
  if (policy && typeof policy === 'string') out.policyId = policy;
  if (scheme && typeof scheme === 'string') out.schemeId = scheme;
  if (employee && typeof employee === 'string') out.employeeId = employee;
  if (product && typeof product === 'string') out.productId = product;
  return out;
}

function toCounterRow(doc) {
  const key = doc.key || doc._id;
  const value = doc.value ?? doc.seq ?? 0;
  return { key: String(key), value };
}

async function gatherData() {
  const result = { exportedAt: new Date().toISOString(), collections: {} };
  for (const { name, delegate } of MODEL_MAP) {
    try {
      result.collections[name] = await prisma[delegate].findMany({});
    } catch (err) {
      result.collections[name] = { error: err.message };
    }
  }
  // Counters (single table in the new schema)
  try {
    const counters = await prisma.counter.findMany({});
    result.collections.counters = counters;
    result.collections.billingCounters = counters.filter((c) => c.key.startsWith('billing_'));
  } catch {
    result.collections.counters = [];
    result.collections.billingCounters = [];
  }
  return result;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// GET /api/backup/data — JSON dump of all collections
exports.getDataBackup = async (req, res, next) => {
  try {
    const data = await gatherData();
    const filename = `samwin-data-backup-${timestamp()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    next(err);
  }
};

// GET /api/backup/full — Zip with source code + data
exports.getFullBackup = async (req, res, next) => {
  try {
    const filename = `samwin-full-backup-${timestamp()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') console.error('archive warning:', err);
    });
    archive.on('error', (err) => {
      console.error('archive error:', err);
      next(err);
    });
    archive.pipe(res);

    // 1. Include data dump
    const data = await gatherData();
    archive.append(JSON.stringify(data, null, 2), { name: 'data/database-export.json' });

    // 2. Include each collection as its own JSON file (for easy browsing)
    for (const [name, docs] of Object.entries(data.collections)) {
      archive.append(JSON.stringify(docs, null, 2), { name: `data/collections/${name}.json` });
    }

    // 3. Include source code (server/src and client/src)
    const projectRoot = path.join(__dirname, '../../..');
    const sourceDirs = [
      { src: path.join(projectRoot, 'server/src'), dest: 'source/server/src' },
      { src: path.join(projectRoot, 'client/src'), dest: 'source/client/src' },
      { src: path.join(projectRoot, 'client/public'), dest: 'source/client/public' },
    ];
    for (const { src, dest } of sourceDirs) {
      if (fs.existsSync(src)) archive.directory(src, dest);
    }

    // 4. Top-level config files
    const configFiles = [
      ['package.json', 'source/package.json'],
      ['README.md', 'source/README.md'],
      ['.gitignore', 'source/.gitignore'],
      ['render.yaml', 'source/render.yaml'],
      ['server/package.json', 'source/server/package.json'],
      ['server/.env.example', 'source/server/.env.example'],
      ['client/package.json', 'source/client/package.json'],
      ['client/vite.config.js', 'source/client/vite.config.js'],
      ['client/tailwind.config.js', 'source/client/tailwind.config.js'],
      ['client/postcss.config.js', 'source/client/postcss.config.js'],
      ['client/index.html', 'source/client/index.html'],
      ['client/vercel.json', 'source/client/vercel.json'],
    ];
    for (const [rel, dest] of configFiles) {
      const full = path.join(projectRoot, rel);
      if (fs.existsSync(full)) archive.file(full, { name: dest });
    }

    // 5. README inside the backup
    const readme = `Samwin Infotech — Full Backup
Generated: ${new Date().toISOString()}

Contents:
- /data/database-export.json   — Single-file dump of all collections
- /data/collections/*.json     — Per-collection dumps for easy browsing
- /source/                     — Application source code (server + client)

Restore notes:
- Data: load each collection JSON into MongoDB, OR run server/src/seeds/importData.js after pointing it at /data/collections/.
- Source: run "npm install" inside server/ and client/, copy this backup's data into your DB, then "npm run dev".
`;
    archive.append(readme, { name: 'README-BACKUP.txt' });

    await archive.finalize();
  } catch (err) {
    next(err);
  }
};

// POST /api/backup/restore — accepts a JSON file (from "Backup Data" download)
// and replaces each collection's contents.
exports.restoreBackup = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return error(res, 'No backup file uploaded', 400);
    }

    let parsed;
    try {
      parsed = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch (e) {
      return error(res, 'Invalid JSON file: ' + e.message, 400);
    }

    // Accept two shapes:
    //   1. { exportedAt, collections: { users: [...], ... } }   — from Backup Data button
    //   2. { users: [...], customers: [...] }                   — flat
    const data = parsed.collections || parsed;
    if (typeof data !== 'object' || data === null) {
      return error(res, 'Backup file does not contain collection data', 400);
    }

    const result = { restored: {}, skipped: [], totalDocs: 0, errors: [] };

    const toRestore = MODEL_MAP.filter(({ name }) => Array.isArray(data[name]));
    for (const { name } of MODEL_MAP) {
      if (!Array.isArray(data[name])) result.skipped.push(name);
    }

    // Pass 1: delete every targeted collection's current rows, children
    // before parents (reverse of MODEL_MAP), so FK constraints never block.
    for (const { name, delegate } of [...toRestore].reverse()) {
      try {
        await prisma[delegate].deleteMany({});
      } catch (err) {
        result.errors.push({ collection: name, message: `delete failed: ${err.message}` });
      }
    }

    // Pass 2: recreate every collection, parents before children.
    for (const { name, delegate } of toRestore) {
      const docs = data[name];
      let ok = 0;
      const errs = [];
      for (const doc of docs) {
        try {
          await prisma[delegate].create({ data: toPrismaShape(doc) });
          ok += 1;
        } catch (e) {
          errs.push(e.message);
        }
      }
      result.restored[name] = ok;
      result.totalDocs += ok;
      if (errs.length) result.errors.push({ collection: name, count: errs.length, sample: errs.slice(0, 3) });
    }

    // Counters — accept both old { _id, seq } and new { key, value } shapes
    for (const keyName of ['counters', 'billingCounters']) {
      if (Array.isArray(data[keyName])) {
        try {
          let n = 0;
          for (const raw of data[keyName]) {
            const { key, value } = toCounterRow(raw);
            await prisma.counter.upsert({
              where: { key },
              update: { value },
              create: { key, value },
            });
            n += 1;
          }
          result.restored[keyName] = n;
        } catch (err) {
          result.errors.push({ collection: keyName, message: err.message });
        }
      }
    }

    success(res, result);
  } catch (err) {
    next(err);
  }
};

// POST /api/backup/git-push — export DB, commit backup folder, push to GitHub
exports.gitPush = async (req, res, next) => {
  try {
    const projectRoot = path.join(__dirname, '../../..');

    // Only meaningful when the server is running from a live git checkout
    // (dev machine / source-based deployment). The packaged desktop app
    // ships plain copied files with no `.git` in its ancestry.
    try {
      await runGit(['rev-parse', '--is-inside-work-tree'], projectRoot);
    } catch {
      return error(res, 'Push to GitHub is only available when running from a git checkout, not from the packaged desktop app.', 400);
    }

    // 1. Export DB to a fresh backup folder
    const data = await gatherData();
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const backupDir = path.join(projectRoot, `backup_${stamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    for (const [name, docs] of Object.entries(data.collections)) {
      fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(docs, null, 2));
    }

    // 2. Pull, stage, commit, push
    const log = [];
    try {
      log.push('Pulling latest (auto-stashing any local changes)...');
      // --autostash stashes any uncommitted/unstaged work, pulls, then restores it
      await runGit(['pull', '--rebase', '--autostash'], projectRoot);

      log.push('Staging backup folder...');
      await runGit(['add', `backup_${stamp}`], projectRoot);

      // Check if anything is staged
      const staged = await runGit(['diff', '--cached', '--name-only'], projectRoot);
      if (!staged) {
        return success(res, { pushed: false, message: 'No changes to push', log });
      }

      log.push('Committing...');
      const message = `Auto DB backup ${d.toISOString().slice(0, 16).replace('T', ' ')}`;
      await runGit(['commit', '-m', message, '--no-verify'], projectRoot);

      log.push('Pushing to GitHub...');
      const pushOut = await runGit(['push'], projectRoot);
      log.push(pushOut || 'Pushed');

      success(res, { pushed: true, backupFolder: `backup_${stamp}`, totalDocs: Object.values(data.collections).reduce((s, c) => s + (Array.isArray(c) ? c.length : 0), 0), log });
    } catch (gitErr) {
      return error(res, `Git failed: ${gitErr.message}`, 500);
    }
  } catch (err) {
    next(err);
  }
};
