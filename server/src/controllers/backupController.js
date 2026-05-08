const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const mongoose = require('mongoose');

// All models with their collection name in the export
const COLLECTIONS = [
  { name: 'users', model: 'User' },
  { name: 'customers', model: 'Customer' },
  { name: 'schemes', model: 'Scheme' },
  { name: 'policies', model: 'Policy' },
  { name: 'payments', model: 'Payment' },
  { name: 'credits', model: 'Credit' },
  { name: 'notifications', model: 'Notification' },
  { name: 'stocks', model: 'Stock' },
  { name: 'expenses', model: 'Expense' },
  { name: 'expenseCategories', model: 'ExpenseCategory' },
  { name: 'sales', model: 'Sale' },
  { name: 'salesCategories', model: 'SalesCategory' },
  { name: 'vehicleInsurances', model: 'VehicleInsurance' },
  { name: 'insuranceTypes', model: 'InsuranceType' },
  { name: 'billings', model: 'Billing' },
  { name: 'lms', model: 'LMS' },
  { name: 'customReminders', model: 'CustomReminder' },
  { name: 'employees', model: 'Employee' },
  { name: 'attendances', model: 'Attendance' },
  { name: 'services', model: 'Service' },
];

async function gatherData() {
  // Lazy-require models so this controller works regardless of registration order
  require('../models/User');
  require('../models/Customer');
  require('../models/Scheme');
  require('../models/Policy');
  require('../models/Payment');
  require('../models/Credit');
  require('../models/Notification');
  require('../models/Stock');
  require('../models/Expense');
  require('../models/ExpenseCategory');
  require('../models/Sale');
  require('../models/SalesCategory');
  require('../models/VehicleInsurance');
  require('../models/InsuranceType');
  require('../models/Billing');
  require('../models/LMS');
  require('../models/CustomReminder');
  require('../models/Employee');
  require('../models/Attendance');
  require('../models/Service');

  const result = { exportedAt: new Date().toISOString(), collections: {} };
  for (const { name, model } of COLLECTIONS) {
    try {
      const Model = mongoose.model(model);
      const docs = await Model.find({}).lean();
      result.collections[name] = docs;
    } catch (err) {
      result.collections[name] = { error: err.message };
    }
  }
  // Counters (raw collections — not Mongoose models)
  try {
    result.collections.counters = await mongoose.connection.db
      .collection('counters')
      .find({})
      .toArray();
  } catch {
    result.collections.counters = [];
  }
  try {
    result.collections.billingCounters = await mongoose.connection.db
      .collection('billingcounters')
      .find({})
      .toArray();
  } catch {
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
