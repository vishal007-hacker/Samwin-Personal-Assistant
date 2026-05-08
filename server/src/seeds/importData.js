const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { mongoUri } = require('../config/env');

// Import all models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Scheme = require('../models/Scheme');
const Policy = require('../models/Policy');
const Payment = require('../models/Payment');
const Credit = require('../models/Credit');
const Notification = require('../models/Notification');
const Stock = require('../models/Stock');
const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const Sale = require('../models/Sale');
const SalesCategory = require('../models/SalesCategory');
const VehicleInsurance = require('../models/VehicleInsurance');
const InsuranceType = require('../models/InsuranceType');
const Billing = require('../models/Billing');
const LMS = require('../models/LMS');
const CustomReminder = require('../models/CustomReminder');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Service = require('../models/Service');
const Account = require('../models/Account');
const AccountSnapshot = require('../models/AccountSnapshot');
const MaintenanceProduct = require('../models/MaintenanceProduct');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const DeviceService = require('../models/DeviceService');

const collections = [
  { name: 'users', model: User },
  { name: 'customers', model: Customer },
  { name: 'schemes', model: Scheme },
  { name: 'policies', model: Policy },
  { name: 'payments', model: Payment },
  { name: 'credits', model: Credit },
  { name: 'notifications', model: Notification },
  { name: 'stocks', model: Stock },
  { name: 'expenses', model: Expense },
  { name: 'expenseCategories', model: ExpenseCategory },
  { name: 'sales', model: Sale },
  { name: 'salesCategories', model: SalesCategory },
  { name: 'vehicleInsurances', model: VehicleInsurance },
  { name: 'insuranceTypes', model: InsuranceType },
  { name: 'billings', model: Billing },
  { name: 'lms', model: LMS },
  { name: 'customReminders', model: CustomReminder },
  { name: 'employees', model: Employee },
  { name: 'attendances', model: Attendance },
  { name: 'services', model: Service },
  { name: 'accounts', model: Account },
  { name: 'accountSnapshots', model: AccountSnapshot },
  { name: 'maintenanceProducts', model: MaintenanceProduct },
  { name: 'maintenanceRecords', model: MaintenanceRecord },
  { name: 'deviceServices', model: DeviceService },
];

async function importData() {
  // Get backup folder from command line argument
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error('Usage: node importData.js <backup-folder-path>');
    console.error('Example: node importData.js ../../../backup_2026-03-25_14-30-00');
    process.exit(1);
  }

  const fullPath = path.resolve(backupDir);
  if (!fs.existsSync(fullPath)) {
    console.error(`Backup folder not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let totalDocs = 0;

    for (const { name, model } of collections) {
      const filePath = path.join(fullPath, `${name}.json`);
      if (!fs.existsSync(filePath)) {
        console.log(`  ${name}: skipped (file not found)`);
        continue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.length === 0) {
        console.log(`  ${name}: 0 records (empty)`);
        continue;
      }

      // Drop existing collection and insert fresh
      await model.deleteMany({});
      await model.insertMany(data, { ordered: false }).catch((err) => {
        // Some may fail due to unique constraints, that's ok
        if (err.insertedDocs) {
          console.log(`  ${name}: ${err.insertedDocs.length}/${data.length} records (some duplicates skipped)`);
          return;
        }
        throw err;
      });

      console.log(`  ${name}: ${data.length} records restored`);
      totalDocs += data.length;
    }

    // Restore counters
    const countersFile = path.join(fullPath, 'counters.json');
    if (fs.existsSync(countersFile)) {
      const counters = JSON.parse(fs.readFileSync(countersFile, 'utf-8'));
      const col = mongoose.connection.db.collection('counters');
      await col.deleteMany({});
      if (counters.length > 0) await col.insertMany(counters);
      console.log(`  counters: ${counters.length} records restored`);
    }

    const billingCountersFile = path.join(fullPath, 'billingCounters.json');
    if (fs.existsSync(billingCountersFile)) {
      const billingCounters = JSON.parse(fs.readFileSync(billingCountersFile, 'utf-8'));
      const col = mongoose.connection.db.collection('billingcounters');
      await col.deleteMany({});
      if (billingCounters.length > 0) await col.insertMany(billingCounters);
      console.log(`  billingCounters: ${billingCounters.length} records restored`);
    }

    console.log(`\nImport complete!`);
    console.log(`Total: ${totalDocs} documents restored`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Import error:', err.message);
    process.exit(1);
  }
}

importData();
