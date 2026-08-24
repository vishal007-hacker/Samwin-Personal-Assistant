// One-time data migration: copies every collection from the existing MongoDB
// database into PostgreSQL via Prisma, preserving Mongo ObjectIds as the new
// Prisma `id` (String) so all relations carry over with zero remapping.
//
// Run with: node src/seeds/migrateFromMongo.js
//
// Safe to re-run: truncates every Postgres table first (this is a one-time
// cutover script, not an incremental sync).

const mongoose = require('mongoose');
const prisma = require('../config/prisma');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance-tracker';

// Deep-clones a value through JSON so embedded ObjectId/Date instances become
// plain hex-string / ISO-string values — safe input for a Prisma Json column.
const toJson = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
const toId = (v) => (v === undefined || v === null ? null : v.toString());
const toIdRequired = (v) => v.toString();

// Audit-trail fields (createdBy/recordedBy) are nullable FKs pointing at User.
// MongoDB never enforced referential integrity, so some point at users that
// were since deleted — Postgres will reject those. Drop the dangling
// reference rather than fail the whole record; the data itself isn't lost.
let validUserIds = null;
const toUserId = (v) => {
  const id = toId(v);
  if (id === null) return null;
  return validUserIds.has(id) ? id : null;
};

const results = [];

async function migrateCollection(label, collectionName, mapFn, createFn) {
  const db = mongoose.connection.db;
  const docs = await db.collection(collectionName).find({}).toArray();
  let ok = 0;
  let failed = 0;
  const errors = [];
  for (const doc of docs) {
    try {
      const data = mapFn(doc);
      await createFn(data);
      ok++;
    } catch (err) {
      failed++;
      errors.push({ id: doc._id?.toString(), message: err.message });
    }
  }
  results.push({ label, source: docs.length, migrated: ok, failed, errors: errors.slice(0, 5) });
  console.log(`  ${label.padEnd(24)} ${String(ok).padStart(4)}/${docs.length}${failed ? `  (${failed} FAILED)` : ''}`);
}

async function truncateAll() {
  console.log('Truncating all Postgres tables...');
  const tables = [
    'Payment', 'Notification', 'Policy', 'VehicleInsurance', 'Service', 'Credit',
    'Attendance', 'MaintenanceRecord', 'Sale', 'Expense', 'Billing', 'AccountSnapshot',
    'Customer', 'Scheme', 'Employee', 'MaintenanceProduct', 'Account', 'LMS',
    'CustomReminder', 'Poster', 'LuckyDrawParticipant', 'Stock',
    'DeviceType', 'ExpenseCategory', 'InsuranceType', 'SalesCategory', 'ServiceType',
    'DeviceService', 'Counter', 'User',
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
  }
}

async function run() {
  console.log(`Connecting to MongoDB (${MONGO_URI})...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  await truncateAll();
  console.log('\nMigrating collections...\n');

  // ── Stage 1: no dependencies ──
  await migrateCollection('User', 'users', (d) => ({
    id: toIdRequired(d._id),
    name: d.name,
    email: d.email,
    password: d.password,
    role: d.role || 'agent',
    phone: d.phone ?? null,
    isActive: d.isActive ?? true,
    pushSubscription: toJson(d.pushSubscription),
    createdAt: d.createdAt ?? new Date(),
    updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.user.create({ data }));

  {
    const users = await mongoose.connection.db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
    validUserIds = new Set(users.map((u) => u._id.toString()));
  }

  // Merge counters + billingcounters into the single Counter table
  {
    const db = mongoose.connection.db;
    const [counters, billingCounters] = await Promise.all([
      db.collection('counters').find({}).toArray(),
      db.collection('billingcounters').find({}).toArray(),
    ]);
    const all = [...counters, ...billingCounters];
    let ok = 0;
    for (const c of all) {
      await prisma.counter.create({ data: { key: c._id.toString(), value: c.seq ?? 0 } });
      ok++;
    }
    results.push({ label: 'Counter', source: all.length, migrated: ok, failed: 0, errors: [] });
    console.log(`  ${'Counter'.padEnd(24)} ${String(ok).padStart(4)}/${all.length}`);
  }

  await migrateCollection('DeviceType', 'devicetypes', (d) => ({
    id: toIdRequired(d._id), name: d.name, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.deviceType.create({ data }));

  await migrateCollection('ExpenseCategory', 'expensecategories', (d) => ({
    id: toIdRequired(d._id), name: d.name,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.expenseCategory.create({ data }));

  await migrateCollection('InsuranceType', 'insurancetypes', (d) => ({
    id: toIdRequired(d._id), name: d.name, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.insuranceType.create({ data }));

  await migrateCollection('SalesCategory', 'salescategories', (d) => ({
    id: toIdRequired(d._id), name: d.name,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.salesCategory.create({ data }));

  await migrateCollection('ServiceType', 'servicetypes', (d) => ({
    id: toIdRequired(d._id), name: d.name, isDefault: d.isDefault ?? false, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.serviceType.create({ data }));

  // ── Stage 2: depend only on User (optional) ──
  await migrateCollection('Customer', 'customers', (d) => ({
    id: toIdRequired(d._id), name: d.name, phone: d.phone, email: d.email ?? null,
    address: toJson(d.address), aadhaarNumber: d.aadhaarNumber ?? null, panNumber: d.panNumber ?? null,
    dateOfBirth: d.dateOfBirth ?? null, nominees: toJson(d.nominees), referral: d.referral ?? null,
    notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.customer.create({ data }));

  await migrateCollection('Scheme', 'schemes', (d) => ({
    id: toIdRequired(d._id), name: d.name, type: d.type, company: d.company, description: d.description ?? null,
    premiumFrequencies: d.premiumFrequencies || [], minCoverageAmount: d.minCoverageAmount ?? null,
    maxCoverageAmount: d.maxCoverageAmount ?? null, minMaturityPeriodYears: d.minMaturityPeriodYears ?? null,
    maxMaturityPeriodYears: d.maxMaturityPeriodYears ?? null, minEntryAge: d.minEntryAge ?? null,
    maxEntryAge: d.maxEntryAge ?? null, features: d.features || [], isActive: d.isActive ?? true,
    createdById: toUserId(d.createdBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.scheme.create({ data }));

  await migrateCollection('Employee', 'employees', (d) => ({
    id: toIdRequired(d._id), name: d.name, phone: d.phone, email: d.email ?? null,
    designation: d.designation ?? null, address: d.address ?? null, aadhaarNumber: d.aadhaarNumber ?? null,
    dateOfJoining: d.dateOfJoining ?? null, salary: d.salary ?? 0,
    defaultInTime: d.defaultInTime ?? '09:00', defaultOutTime: d.defaultOutTime ?? '18:00',
    bankAccount: toJson(d.bankAccount), isActive: d.isActive ?? true, notes: d.notes ?? null,
    createdById: toUserId(d.createdBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.employee.create({ data }));

  await migrateCollection('MaintenanceProduct', 'maintenanceproducts', (d) => ({
    id: toIdRequired(d._id), name: d.name, category: d.category ?? null, serialNumber: d.serialNumber ?? null,
    location: d.location ?? null, frequencyDays: d.frequencyDays ?? 30, nextMaintenanceDate: d.nextMaintenanceDate ?? null,
    isActive: d.isActive ?? true, notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.maintenanceProduct.create({ data }));

  await migrateCollection('Account', 'accounts', (d) => ({
    id: toIdRequired(d._id), section: d.section, name: d.name, balance: d.balance ?? 0, order: d.order ?? 0,
    createdById: toUserId(d.createdBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.account.create({ data }));

  await migrateCollection('LMS', 'lms', (d) => ({
    id: toIdRequired(d._id), title: d.title, link: d.link ?? null, userId: d.userId ?? null,
    password: d.password ?? null, message: d.message ?? null, order: d.order ?? 0, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.lMS.create({ data }));

  await migrateCollection('CustomReminder', 'customreminders', (d) => ({
    id: toIdRequired(d._id), title: d.title, intervalMinutes: d.intervalMinutes, endDate: d.endDate,
    nextTrigger: d.nextTrigger, isActive: d.isActive ?? true, lastTriggered: d.lastTriggered ?? null,
    triggerCount: d.triggerCount ?? 0, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.customReminder.create({ data }));

  await migrateCollection('Poster', 'posters', (d) => ({
    id: toIdRequired(d._id), title: d.title ?? null, bodyText: d.bodyText, footer: d.footer ?? null,
    theme: d.theme ?? 'sunset', style: toJson(d.style), isFavorite: d.isFavorite ?? false,
    createdById: toUserId(d.createdBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.poster.create({ data }));

  await migrateCollection('LuckyDrawParticipant', 'luckydrawparticipants', (d) => ({
    id: toIdRequired(d._id), serialNo: d.serialNo ?? null, name: d.name, phone: d.phone,
    purchaseDetails: d.purchaseDetails ?? null, notes: d.notes ?? null, isWinner: d.isWinner ?? false,
    drawnAt: d.drawnAt ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.luckyDrawParticipant.create({ data }));

  await migrateCollection('Stock', 'stocks', (d) => ({
    id: toIdRequired(d._id), uniqueCode: d.uniqueCode ?? null, category: d.category || 'mobile',
    brand: d.brand, model: d.model, ram: d.ram ?? null, storage: d.storage ?? null,
    displaySize: d.displaySize ?? null, displayQuality: d.displayQuality ?? null,
    purchasePrice: d.purchasePrice, sellingPrice: d.sellingPrice, network: d.network ?? null,
    color: d.color ?? null, purchasedFrom: d.purchasedFrom ?? null, status: d.status || 'in_stock',
    soldTo: toJson(d.soldTo), soldAt: d.soldAt ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.stock.create({ data }));

  await migrateCollection('Expense', 'expenses', (d) => ({
    id: toIdRequired(d._id), title: d.title, amount: d.amount, category: d.category, date: d.date,
    paymentMethod: d.paymentMethod || 'cash', notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.expense.create({ data }));

  await migrateCollection('Billing', 'billings', (d) => ({
    id: toIdRequired(d._id), type: d.type, number: d.number ?? null, sequenceNumber: d.sequenceNumber ?? null,
    date: d.date, customer: toJson(d.customer), showGst: d.showGst ?? false, items: toJson(d.items) || [],
    subtotal: d.subtotal ?? 0, cgstRate: d.cgstRate ?? 0, sgstRate: d.sgstRate ?? 0,
    cgstAmount: d.cgstAmount ?? 0, sgstAmount: d.sgstAmount ?? 0, totalAmount: d.totalAmount ?? 0,
    notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.billing.create({ data }));

  await migrateCollection('AccountSnapshot', 'accountsnapshots', (d) => ({
    id: toIdRequired(d._id), date: d.date, recharge: d.recharge ?? 0, banking: d.banking ?? 0,
    aeps: d.aeps ?? 0, cash: d.cash ?? 0, total: d.total ?? 0, details: toJson(d.details),
    createdById: toUserId(d.createdBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.accountSnapshot.create({ data }));

  await migrateCollection('DeviceService', 'deviceservices', (d) => ({
    id: toIdRequired(d._id), serialNo: d.serialNo ?? null, deviceType: d.deviceType, lockType: d.lockType || 'none',
    lockValue: d.lockValue ?? null, problem: d.problem ?? null, date: d.date, customerName: d.customerName,
    customerPhone: d.customerPhone ?? null, status: d.status || 'pending', amount: d.amount ?? 0,
    notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.deviceService.create({ data }));

  // ── Stage 3: depend on Stage 2 entities ──
  await migrateCollection('Policy', 'policies', (d) => ({
    id: toIdRequired(d._id), policyNumber: d.policyNumber, customerId: toIdRequired(d.customer),
    schemeId: toIdRequired(d.scheme), startDate: d.startDate, maturityDate: d.maturityDate,
    premiumAmount: d.premiumAmount, premiumFrequency: d.premiumFrequency, sumAssured: d.sumAssured,
    nominee: toJson(d.nominee), nextPremiumDate: d.nextPremiumDate ?? null, status: d.status || 'active',
    reminderSettings: toJson(d.reminderSettings), documents: toJson(d.documents), notes: d.notes ?? null,
    createdById: toUserId(d.createdBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.policy.create({ data }));

  await migrateCollection('VehicleInsurance', 'vehicleinsurances', (d) => ({
    id: toIdRequired(d._id), customerId: toIdRequired(d.customer), insuranceType: d.insuranceType,
    vehicleNumber: d.vehicleNumber ?? null, vehicleBrand: d.vehicleBrand, model: d.model,
    yearOfManufacturing: d.yearOfManufacturing ?? null, registrationDate: d.registrationDate ?? null,
    engineNumber: d.engineNumber ?? null, chasisNumber: d.chasisNumber ?? null, policyCompany: d.policyCompany ?? null,
    policyNumber: d.policyNumber, policyExpiryDate: d.policyExpiryDate, reminderStartDate: d.reminderStartDate ?? null,
    rcBookFile: d.rcBookFile ?? null, oldInsuranceFile: d.oldInsuranceFile ?? null, status: d.status || 'active',
    notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.vehicleInsurance.create({ data }));

  await migrateCollection('Service', 'services', (d) => ({
    id: toIdRequired(d._id), date: d.date, customerId: toIdRequired(d.customer), typeOfWork: d.typeOfWork,
    materialsUsed: d.materialsUsed ?? null, askingPrice: d.askingPrice ?? 0, receivedCash: d.receivedCash ?? 0,
    notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.service.create({ data }));

  await migrateCollection('Credit', 'credits', (d) => ({
    id: toIdRequired(d._id), customerId: toIdRequired(d.customer), reason: d.reason, totalAmount: d.totalAmount,
    balanceAmount: d.balanceAmount, dueDate: d.dueDate, status: d.status || 'open',
    transactions: toJson(d.transactions) || [], notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.credit.create({ data }));

  await migrateCollection('Attendance', 'attendances', (d) => ({
    id: toIdRequired(d._id), employeeId: toIdRequired(d.employee), date: d.date, morningIn: d.morningIn ?? null,
    afternoonOut: d.afternoonOut ?? null, afterLunchIn: d.afterLunchIn ?? null, nightOut: d.nightOut ?? null,
    workDetails: d.workDetails ?? null, location: d.location ?? null, permissionHours: d.permissionHours ?? 0,
    permissionReason: d.permissionReason ?? null, expenses: d.expenses ?? 0, expenseNotes: d.expenseNotes ?? null,
    status: d.status || 'present', notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.attendance.create({ data }));

  await migrateCollection('MaintenanceRecord', 'maintenancerecords', (d) => ({
    id: toIdRequired(d._id), productId: toIdRequired(d.product), date: d.date, workDone: d.workDone ?? null,
    cost: d.cost ?? 0, servicePersonName: d.servicePersonName ?? null, servicePersonContact: d.servicePersonContact ?? null,
    nextDueDate: d.nextDueDate ?? null, notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.maintenanceRecord.create({ data }));

  await migrateCollection('Sale', 'sales', (d) => ({
    id: toIdRequired(d._id), categoryId: toIdRequired(d.category), categoryName: d.categoryName,
    quantity: d.quantity ?? 1, unitPrice: d.unitPrice, amount: d.amount, paymentMethod: d.paymentMethod || 'cash',
    date: d.date, customerName: d.customerName ?? null, notes: d.notes ?? null, createdById: toUserId(d.createdBy),
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.sale.create({ data }));

  // ── Stage 4: depend on Policy ──
  await migrateCollection('Payment', 'payments', (d) => ({
    id: toIdRequired(d._id), policyId: toIdRequired(d.policy), customerId: toIdRequired(d.customer),
    amount: d.amount, paymentDate: d.paymentDate, premiumDueDate: d.premiumDueDate ?? null,
    paymentMethod: d.paymentMethod || 'cash', referenceNumber: d.referenceNumber ?? null, notes: d.notes ?? null,
    recordedById: toUserId(d.recordedBy), createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.payment.create({ data }));

  await migrateCollection('Notification', 'notifications', (d) => ({
    id: toIdRequired(d._id), type: d.type, policyId: toId(d.policy), customerId: toId(d.customer),
    message: d.message, channels: toJson(d.channels), isRead: d.isRead ?? false, scheduledFor: d.scheduledFor ?? null,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  }), (data) => prisma.notification.create({ data }));

  console.log('\n── Summary ──');
  let totalSource = 0, totalOk = 0, totalFail = 0;
  for (const r of results) {
    totalSource += r.source; totalOk += r.migrated; totalFail += r.failed;
    if (r.failed > 0) {
      console.log(`  ${r.label}: ${r.failed} failures`);
      r.errors.forEach((e) => console.log(`    - ${e.id}: ${e.message}`));
    }
  }
  console.log(`\nTotal: ${totalOk}/${totalSource} migrated${totalFail ? `, ${totalFail} FAILED` : ''}`);

  await mongoose.disconnect();
  await prisma.$disconnect();
  process.exit(totalFail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
