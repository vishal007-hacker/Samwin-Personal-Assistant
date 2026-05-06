const Sale = require('../models/Sale');
const SalesCategory = require('../models/SalesCategory');
const { success, paginated, error } = require('../utils/responseHelper');

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/sales/categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await SalesCategory.find().sort({ name: 1 });
    success(res, categories);
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const existing = await SalesCategory.findOne({ name: name.trim() });
    if (existing) return error(res, 'Category already exists', 400);
    const category = await SalesCategory.create({ name: name.trim() });
    success(res, category, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/sales/categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await SalesCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return error(res, 'Category not found', 404);
    success(res, category);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sales/categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await SalesCategory.findByIdAndDelete(req.params.id);
    if (!result) return error(res, 'Category not found', 404);
    success(res, { message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Sales ───────────────────────────────────────────────────────────────────

// GET /api/sales
exports.getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, from, to, paymentMethod } = req.query;
    const query = {};

    if (category) query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { categoryName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Sale.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Sale.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/sales/summary
exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    // Today's income
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalResult, todayResult, byCategory, byPaymentMethod, monthlyTrend] = await Promise.all([
      Sale.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$categoryName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

    success(res, {
      total: totalResult[0]?.total || 0,
      count: totalResult[0]?.count || 0,
      todayIncome: todayResult[0]?.total || 0,
      todayCount: todayResult[0]?.count || 0,
      byCategory,
      byPaymentMethod,
      monthlyTrend,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales
exports.createSale = async (req, res, next) => {
  try {
    const cat = await SalesCategory.findById(req.body.category);
    if (!cat) return error(res, 'Category not found', 404);

    const sale = await Sale.create({
      ...req.body,
      categoryName: cat.name,
      createdBy: req.user._id,
    });
    success(res, sale, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/sales/:id
exports.updateSale = async (req, res, next) => {
  try {
    if (req.body.category) {
      const cat = await SalesCategory.findById(req.body.category);
      if (!cat) return error(res, 'Category not found', 404);
      req.body.categoryName = cat.name;
    }
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sale) return error(res, 'Sale not found', 404);
    success(res, sale);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sales/:id
exports.deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return error(res, 'Sale not found', 404);
    success(res, { message: 'Sale deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/sales/report
exports.getReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return error(res, 'Please provide from and to dates', 400);

    const match = {
      date: {
        $gte: new Date(from),
        $lte: new Date(to + 'T23:59:59.999Z'),
      },
    };

    const [dailyBreakdown, categoryBreakdown, paymentBreakdown, totalResult] = await Promise.all([
      Sale.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$categoryName', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    success(res, {
      total: totalResult[0]?.total || 0,
      count: totalResult[0]?.count || 0,
      dailyBreakdown,
      categoryBreakdown,
      paymentBreakdown,
    });
  } catch (err) {
    next(err);
  }
};
