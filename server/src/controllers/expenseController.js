const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/expenses
exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, from, to, paymentMethod } = req.query;
    const where = {};

    if (category) where.category = category;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { date: 'desc' }, skip, take: Number(limit) }),
      prisma.expense.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/summary
exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    const expenses = await prisma.expense.findMany({ where });

    const total = expenses.reduce((s, r) => s + (r.amount || 0), 0);
    const count = expenses.length;

    const byCategoryMap = {};
    const byPaymentMethodMap = {};
    const byMonth = {};

    for (const r of expenses) {
      const amt = r.amount || 0;

      byCategoryMap[r.category] = byCategoryMap[r.category] || { _id: r.category, total: 0, count: 0 };
      byCategoryMap[r.category].total += amt;
      byCategoryMap[r.category].count += 1;

      byPaymentMethodMap[r.paymentMethod] = byPaymentMethodMap[r.paymentMethod] || { _id: r.paymentMethod, total: 0, count: 0 };
      byPaymentMethodMap[r.paymentMethod].total += amt;
      byPaymentMethodMap[r.paymentMethod].count += 1;

      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = byMonth[key] || { _id: { year: d.getFullYear(), month: d.getMonth() + 1 }, total: 0, count: 0 };
      byMonth[key].total += amt;
      byMonth[key].count += 1;
    }

    success(res, {
      total,
      count,
      byCategory: Object.values(byCategoryMap).sort((a, b) => b.total - a.total),
      byPaymentMethod: Object.values(byPaymentMethodMap).sort((a, b) => b.total - a.total),
      monthlyTrend: Object.values(byMonth)
        .sort((a, b) => (b._id.year - a._id.year) || (b._id.month - a._id.month))
        .slice(0, 12),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/categories
exports.getCategories = async (req, res, next) => {
  try {
    const [fromExpenses, savedCategories] = await Promise.all([
      prisma.expense.findMany({ distinct: ['category'], select: { category: true } }),
      prisma.expenseCategory.findMany({ select: { name: true } }),
    ]);
    const fromExp = fromExpenses.map((c) => c.category).filter(Boolean);
    const saved = savedCategories.map((c) => c.name);
    const merged = [...new Set([...fromExp, ...saved])].sort();
    success(res, merged);
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const clean = String(name || '').trim();
    if (!clean) return error(res, 'Category name is required', 400);
    const existing = await prisma.expenseCategory.findUnique({ where: { name: clean } });
    if (existing) return error(res, 'Category already exists', 400);
    const category = await prisma.expenseCategory.create({ data: { name: clean } });
    success(res, one(category), 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Category already exists', 400);
    next(err);
  }
};

// DELETE /api/expenses/categories/:name
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await prisma.expenseCategory.delete({ where: { name: req.params.name } });
    if (!result) return error(res, 'Category not found', 404);
    success(res, { message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Category not found', 404);
    next(err);
  }
};

// GET /api/expenses/:id
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense) return error(res, 'Expense not found', 404);
    success(res, one(expense));
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
exports.createExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.create({ data: { ...req.body, createdById: req.user.id } });
    success(res, one(expense), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data: req.body });
    if (!expense) return error(res, 'Expense not found', 404);
    success(res, one(expense));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Expense not found', 404);
    next(err);
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.delete({ where: { id: req.params.id } });
    if (!expense) return error(res, 'Expense not found', 404);
    success(res, { message: 'Expense deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Expense not found', 404);
    next(err);
  }
};