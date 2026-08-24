/**
 * Export ALL database tables to a timestamped backup folder.
 *
 * Usage:  node src/seeds/exportData.js
 *
 * Output:   ./backup_<YYYY-MM-DD>_<HH-MM-SS>/
 *             users.json, customers.json, ... counters.json ...
 *
 * Each JSON file is an array of rows exactly as returned by Prisma (findMany,
 * so it is re-importable via `importData.js`). Counters use the new
 * { key, value } shape for the key/value Counter table.
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const prisma = require('../config/prisma');

// Mirrors importData.js MODEL_MAP (file name -> Prisma delegate name).
const MODEL_MAP = [
  { file: 'users',              delegate: 'user' },
  { file: 'customers',          delegate: 'customer' },
  { file: 'schemes',            delegate: 'scheme' },
  { file: 'payments',           delegate: 'payment' },
  { file: 'policies',           delegate: 'policy' },
  { file: 'credits',            delegate: 'credit' },
  { file: 'stocks',             delegate: 'stock' },
  { file: 'sales',              delegate: 'sale' },
  { file: 'salesCategories',    delegate: 'salesCategory' },
  { file: 'expenses',           delegate: 'expense' },
  { file: 'expenseCategories',  delegate: 'expenseCategory' },
  { file: 'accounts',           delegate: 'account' },
  { file: 'accountSnapshots',   delegate: 'accountSnapshot' },
  { file: 'employees',          delegate: 'employee' },
  { file: 'attendances',        delegate: 'attendance' },
  { file: 'services',           delegate: 'service' },
  { file: 'serviceTypes',       delegate: 'serviceType' },
  { file: 'deviceServices',     delegate: 'deviceService' },
  { file: 'deviceTypes',        delegate: 'deviceType' },
  { file: 'maintenanceProducts', delegate: 'maintenanceProduct' },
  { file: 'maintenanceRecords', delegate: 'maintenanceRecord' },
  { file: 'vehicleInsurances',  delegate: 'vehicleInsurance' },
  { file: 'insuranceTypes',     delegate: 'insuranceType' },
  { file: 'billings',           delegate: 'billing' },
  { file: 'notifications',      delegate: 'notification' },
  { file: 'lms',                delegate: 'lms' },
  { file: 'customReminders',    delegate: 'customReminder' },
  { file: 'luckyDrawParticipants', delegate: 'luckyDrawParticipant' },
  { file: 'posters',            delegate: 'poster' },
];

function makeBackupDir() {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  const dir = path.join(__dirname, `../../backup_${date}_${time}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function exportData() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    const backupDir = makeBackupDir();
    console.log(`Backup folder: ${backupDir}`);

    let totalDocs = 0;
    const manifest = {};

    for (const { file, delegate } of MODEL_MAP) {
      const docs = await prisma[delegate].findMany({});
      const outPath = path.join(backupDir, `${file}.json`);
      fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
      manifest[file] = docs.length;
      totalDocs += docs.length;
      console.log(`  ${file}: ${docs.length} records`);
    }

    // Counters as { key, value } (generic Prisma row)
    const counters = await prisma.counter.findMany({});
    const counterRows = counters.map((c) => ({ key: c.key, value: c.value }));
    fs.writeFileSync(path.join(backupDir, 'counters.json'), JSON.stringify(counterRows, null, 2));
    manifest.counters = counterRows.length;
    totalDocs += counterRows.length;
    console.log(`  counters: ${counterRows.length} records`);

    // Manifest for human/auditing use
    fs.writeFileSync(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify({ createdAt: new Date().toISOString(), totalDocs, tables: manifest }, null, 2),
    );

    console.log(`\nExport complete! ${totalDocs} documents written to ${path.basename(backupDir)}/`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Export error:', err.message || err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

// CLI entry point. Guarded so the module can also be `require()`d
// programmatically (e.g. by smoke tests) without auto-running + process.exit.
if (require.main === module) { exportData(); }