const MaintenanceProduct = require('../models/MaintenanceProduct');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const { success, error } = require('../utils/responseHelper');

// ── Products ────────────────────────────────────────────────────────────────

// GET /api/maintenance/products
exports.getProducts = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const products = await MaintenanceProduct.find(query).sort({ nextMaintenanceDate: 1, name: 1 });

    // Fetch last record for each product (for "lastServiced" info)
    const productIds = products.map((p) => p._id);
    const lastRecords = await MaintenanceRecord.aggregate([
      { $match: { product: { $in: productIds } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$product',
          lastDate: { $first: '$date' },
          lastCost: { $first: '$cost' },
          lastWorkDone: { $first: '$workDone' },
          totalCost: { $sum: '$cost' },
          recordCount: { $sum: 1 },
        },
      },
    ]);
    const byProduct = Object.fromEntries(lastRecords.map((r) => [String(r._id), r]));

    const enriched = products.map((p) => {
      const stats = byProduct[String(p._id)] || {};
      return {
        ...p.toObject(),
        lastServicedDate: stats.lastDate || null,
        lastCost: stats.lastCost || 0,
        lastWorkDone: stats.lastWorkDone || '',
        totalSpent: stats.totalCost || 0,
        serviceCount: stats.recordCount || 0,
      };
    });

    success(res, enriched);
  } catch (err) {
    next(err);
  }
};

// POST /api/maintenance/products
exports.createProduct = async (req, res, next) => {
  try {
    // Auto-set nextMaintenanceDate if not provided
    if (!req.body.nextMaintenanceDate) {
      const days = req.body.frequencyDays || 30;
      const next = new Date();
      next.setDate(next.getDate() + days);
      req.body.nextMaintenanceDate = next;
    }
    const product = await MaintenanceProduct.create({ ...req.body, createdBy: req.user._id });
    success(res, product, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/maintenance/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await MaintenanceProduct.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return error(res, 'Product not found', 404);
    success(res, product);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/maintenance/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await MaintenanceProduct.findByIdAndDelete(req.params.id);
    if (!product) return error(res, 'Product not found', 404);
    // Cascade: delete all records for this product
    await MaintenanceRecord.deleteMany({ product: req.params.id });
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Records (Maintenance History) ───────────────────────────────────────────

// GET /api/maintenance/records?product=&from=&to=
exports.getRecords = async (req, res, next) => {
  try {
    const { product, from, to } = req.query;
    const query = {};
    if (product) query.product = product;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    const records = await MaintenanceRecord.find(query)
      .populate('product', 'name category location frequencyDays')
      .sort({ date: -1, createdAt: -1 });
    success(res, records);
  } catch (err) {
    next(err);
  }
};

// POST /api/maintenance/records
exports.createRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.create({ ...req.body, createdBy: req.user._id });

    // Update the product's nextMaintenanceDate
    const product = await MaintenanceProduct.findById(req.body.product);
    if (product) {
      let nextDue = req.body.nextDueDate ? new Date(req.body.nextDueDate) : null;
      if (!nextDue) {
        const days = product.frequencyDays || 30;
        const base = new Date(req.body.date || Date.now());
        nextDue = new Date(base);
        nextDue.setDate(nextDue.getDate() + days);
      }
      product.nextMaintenanceDate = nextDue;
      await product.save();
    }

    await record.populate('product', 'name category location frequencyDays');
    success(res, record, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/maintenance/records/:id
exports.updateRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('product', 'name category location frequencyDays');
    if (!record) return error(res, 'Record not found', 404);
    success(res, record);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/maintenance/records/:id
exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await MaintenanceRecord.findByIdAndDelete(req.params.id);
    if (!record) return error(res, 'Record not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
