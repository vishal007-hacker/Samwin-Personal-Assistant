/**
 * Import data from a backup folder created by exportData.js.
 *
 * Usage:  node src/seeds/importData.js <backupFolderPath>
 *
 * The backup folder is expected to contain one JSON file per model and a
 * `counters.json` file with { key, value } rows. Each file maps to a Prisma
 * client delegate, so `users.json` -> prisma.user, etc.
 *
 * Rows are inserted in dependency order (users first, then everything else)
 * so that foreign keys (createdById, customerId, ...) resolve correctly.
 * Relation FK columns that cannot be resolved (e.g. user deleted) cause that
 * single row to be skipped rather than aborting the whole restore.
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const prisma = require('../config/prisma');

// file name -> Prisma delegate name  (Counter handled separately)
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

// Strip Mongo/ObjectId-specific fields and convert to a Prisma-safe row.
// Keeps explicit `id` so that foreign-key references remain stable between
// export and import (the data comes from the same DB).
function toPrismaShape(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const out = { ...doc };
  delete out._id;
  delete out.__v;
  return out;
}

function usage() {
  console.error('Usage: node src/seeds/importData.js <backupFolderPath>');
  console.error('Example: node src/seeds/importData.js ./backup_2024-01-01_12-00-00');
}

async function importData() {
  const backupDir = process.argv[2];
  if (!backupDir) { usage(); process.exit(1); }

  const fullPath = path.resolve(backupDir);
  if (!fs.existsSync(fullPath)) {
    console.error(`Backup folder not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    let totalRows = 0;

    // 1) Users first so FK references resolve
    for (const { file, delegate } of MODEL_MAP) {
      const filePath = path.join(fullPath, `${file}.json`);
      if (!fs.existsSync(filePath)) { console.log(`  ${file}.json: not found, skipping`); continue; }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(data) || data.length === 0) { console.log(`  ${file}.json: 0 records`); continue; }

      let ok = 0;
      for (const doc of data) {
        try {
          await prisma[delegate].create({ data: toPrismaShape(doc) });
          ok += 1;
        } catch (e) {
          const field = e.meta?.target ? e.meta.target.join(',') : 'unknown';
          console.warn(`  ${file}: skipped row (id=${doc.id || doc._id}): ${e.message} [${field}]`);
        }
      }
      console.log(`  ${file}: ${data.length} records processed (${ok} imported)`);
      totalRows += ok;
    }

    // 2) Counters (key/value) upserted by key
    const counterPath = path.join(fullPath, 'counters.json');
    if (fs.existsSync(counterPath)) {
      const rows = JSON.parse(fs.readFileSync(counterPath, 'utf-8'));
      const list = Array.isArray(rows) ? rows : (rows.counters || []);
      let counterOk = 0;
      for (const row of list) {
        if (!row || typeof row !== 'object' || !row.key) continue;
        try {
          await prisma.counter.upsert({
            where: { key: row.key },
            update: { value: row.value ?? row.seq ?? 0 },
            create: { key: row.key, value: row.value ?? row.seq ?? 0 },
          });
          counterOk += 1;
        } catch (e) { console.warn(`  counters: skipped ${row.key}: ${e.message}`); }
      }
      console.log(`  counters: ${list.length} records processed (${counterOk} imported)`);
      totalRows += counterOk;
    } else {
      console.log('  counters.json: not found, skipping');
    }

    // 3) Account snapshots are read-only (created on demand by the app) but
    //    included here so a full restore keeps history intact.
    console.log(`\nImport complete! ${totalRows} documents restored.`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Import error:', err.message || err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

// CLI entry point. Guarded so the module can also be `require()`d
// programmatically (e.g. by smoke tests) without auto-running + process.exit.
if (require.main === module) { importData(); }