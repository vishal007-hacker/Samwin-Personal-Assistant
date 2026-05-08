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
];

async function exportData() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Create backup folder with date
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupDir = path.join(__dirname, `../../../backup_${date}_${time}`);
    fs.mkdirSync(backupDir, { recursive: true });

    let totalDocs = 0;

    for (const { name, model } of collections) {
      const docs = await model.find({}).lean();
      const filePath = path.join(backupDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      console.log(`  ${name}: ${docs.length} records`);
      totalDocs += docs.length;
    }

    // Also export counters (for stock codes, billing numbers)
    const counters = await mongoose.connection.db.collection('counters').find({}).toArray();
    fs.writeFileSync(path.join(backupDir, 'counters.json'), JSON.stringify(counters, null, 2));
    console.log(`  counters: ${counters.length} records`);

    const billingCounters = await mongoose.connection.db.collection('billingcounters').find({}).toArray();
    fs.writeFileSync(path.join(backupDir, 'billingCounters.json'), JSON.stringify(billingCounters, null, 2));
    console.log(`  billingCounters: ${billingCounters.length} records`);

    console.log(`\nExport complete!`);
    console.log(`Total: ${totalDocs} documents`);
    console.log(`Saved to: ${backupDir}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Export error:', err.message);
    process.exit(1);
  }
}

exportData();
