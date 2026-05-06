const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/expenses
exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, from, to, paymentMethod } = req.query;
    const query = {};

    if (category) query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
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
      Expense.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Expense.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/summary
exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const [totalResult, byCategory, byPaymentMethod, monthlyTrend] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
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
      byCategory,
      byPaymentMethod,
      monthlyTrend,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/categories
exports.getCategories = async (req, res, next) => {
  try {
    const [fromExpenses, savedCategories] = await Promise.all([
      Expense.distinct('category'),
      ExpenseCategory.find().select('name -_id'),
    ]);
    const saved = savedCategories.map((c) => c.name);
    const merged = [...new Set([...fromExpenses, ...saved])].sort();
    success(res, merged);
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return error(res, 'Category name is required', 400);
    const existing = await ExpenseCategory.findOne({ name: name.trim() });
    if (existing) return error(res, 'Category already exists', 400);
    const category = await ExpenseCategory.create({ name: name.trim() });
    success(res, category, 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/categories/:name
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await ExpenseCategory.findOneAndDelete({ name: req.params.name });
    if (!result) return error(res, 'Category not found', 404);
    success(res, { message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/:id
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return error(res, 'Expense not found', 404);
    success(res, expense);
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
exports.createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
    success(res, expense, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return error(res, 'Expense not found', 404);
    success(res, expense);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return error(res, 'Expense not found', 404);
    success(res, { message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};
