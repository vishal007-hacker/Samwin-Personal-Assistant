const Billing = require('../models/Billing');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/billing
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};

    if (type) query.type = type;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    let docs, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const all = await Billing.find(query).sort({ createdAt: -1 });
      const filtered = all.filter(
        (d) =>
          searchRegex.test(d.customer?.name) ||
          searchRegex.test(d.customer?.phone) ||
          searchRegex.test(d.number)
      );
      total = filtered.length;
      docs = filtered.slice(skip, skip + Number(limit));
    } else {
      [docs, total] = await Promise.all([
        Billing.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Billing.countDocuments(query),
      ]);
    }

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/billing/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await Billing.findById(req.params.id);
    if (!doc) return error(res, 'Billing record not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/billing
exports.create = async (req, res, next) => {
  try {
    const doc = await Billing.create({ ...req.body, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/billing/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Billing.findById(req.params.id);
    if (!doc) return error(res, 'Billing record not found', 404);
    Object.assign(doc, req.body);
    await doc.save();
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/billing/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await Billing.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Billing record not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/billing/next-number/:type — preview next number
exports.getNextNumber = async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!['invoice', 'quotation', 'receipt'].includes(type)) {
      return error(res, 'Invalid type', 400);
    }

    const prefix = type === 'invoice' ? 'INV' : type === 'quotation' ? 'QTN' : 'RCT';
    const mongoose = require('mongoose');
    const BillingCounter =
      mongoose.models.BillingCounter || mongoose.model('BillingCounter');

    const counter = await BillingCounter.findById(`billing_${type}`);
    const nextSeq = (counter?.seq || 0) + 1;
    const nextNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;

    success(res, { nextNumber, nextSeq });
  } catch (err) {
    next(err);
  }
};
