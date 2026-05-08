const Account = require('../models/Account');
const AccountSnapshot = require('../models/AccountSnapshot');
const { success, error } = require('../utils/responseHelper');

const DEFAULT_SEEDS = [
  // Recharge
  { section: 'recharge', name: 'Airtel', order: 1 },
  { section: 'recharge', name: 'VI', order: 2 },
  { section: 'recharge', name: 'Jio', order: 3 },
  { section: 'recharge', name: 'BSNL', order: 4 },
  { section: 'recharge', name: 'Multi RC', order: 5 },
  { section: 'recharge', name: 'Available Cash', order: 6 },
  // Banking
  { section: 'banking', name: 'Union', order: 1 },
  { section: 'banking', name: 'KVB', order: 2 },
  { section: 'banking', name: 'Available Cash', order: 3 },
  // AEPS
  { section: 'aeps', name: 'Airtel', order: 1 },
  { section: 'aeps', name: 'Relipay', order: 2 },
  { section: 'aeps', name: 'Digipay', order: 3 },
  { section: 'aeps', name: 'Available Cash', order: 4 },
  // Cash
  { section: 'cash', name: 'Total Cash on Hand', order: 1 },
];

async function seedDefaultsIfEmpty(userId) {
  // Seed each section independently — if a section has no entries, populate its defaults.
  const sections = ['recharge', 'banking', 'aeps', 'cash'];
  for (const section of sections) {
    const count = await Account.countDocuments({ section });
    if (count === 0) {
      const seeds = DEFAULT_SEEDS.filter((s) => s.section === section);
      if (seeds.length > 0) {
        await Account.insertMany(
          seeds.map((s) => ({ ...s, balance: 0, createdBy: userId }))
        );
      }
    }
  }
}

// GET /api/accounts — returns all accounts grouped by section
exports.getAll = async (req, res, next) => {
  try {
    await seedDefaultsIfEmpty(req.user._id);
    const docs = await Account.find({}).sort({ section: 1, order: 1, createdAt: 1 });

    const grouped = { recharge: [], banking: [], aeps: [], cash: [] };
    docs.forEach((d) => {
      if (grouped[d.section]) grouped[d.section].push(d);
    });

    success(res, grouped);
  } catch (err) {
    next(err);
  }
};

// POST /api/accounts
exports.create = async (req, res, next) => {
  try {
    // If no order specified, append to end of section
    if (req.body.order == null) {
      const last = await Account.findOne({ section: req.body.section }).sort({ order: -1 });
      req.body.order = (last?.order || 0) + 1;
    }
    const doc = await Account.create({ ...req.body, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/accounts/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Account.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return error(res, 'Account not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/accounts/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await Account.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Account not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Snapshots ────────────────────────────────────────────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// POST /api/accounts/snapshots — captures current balances under given date (today by default)
exports.saveSnapshot = async (req, res, next) => {
  try {
    const dateInput = req.body?.date ? new Date(req.body.date) : new Date();
    const date = startOfDay(dateInput);

    const accounts = await Account.find({}).lean();
    const sums = { recharge: 0, banking: 0, aeps: 0, cash: 0 };
    const details = accounts.map((a) => {
      sums[a.section] = (sums[a.section] || 0) + (a.balance || 0);
      return { section: a.section, name: a.name, balance: a.balance || 0 };
    });
    const total = sums.recharge + sums.banking + sums.aeps + sums.cash;

    // Upsert: one snapshot per date
    const snap = await AccountSnapshot.findOneAndUpdate(
      { date },
      {
        date,
        recharge: sums.recharge,
        banking: sums.banking,
        aeps: sums.aeps,
        cash: sums.cash,
        total,
        details,
        createdBy: req.user._id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    success(res, snap, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/accounts/snapshots?from=&to=
exports.getSnapshots = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = startOfDay(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    const snaps = await AccountSnapshot.find(query).sort({ date: -1 });
    success(res, snaps);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/accounts/snapshots/:id
exports.deleteSnapshot = async (req, res, next) => {
  try {
    const snap = await AccountSnapshot.findByIdAndDelete(req.params.id);
    if (!snap) return error(res, 'Snapshot not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
