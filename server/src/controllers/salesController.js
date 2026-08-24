const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/sales/categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.salesCategory.findMany({ orderBy: { name: 'asc' } });
    success(res, many(categories));
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const clean = String(name || '').trim();
    if (!clean) return error(res, 'Name is required', 400);
    const existing = await prisma.salesCategory.findUnique({ where: { name: clean } });
    if (existing) return error(res, 'Category already exists', 400);
    const category = await prisma.salesCategory.create({ data: { name: clean } });
    success(res, one(category), 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Category already exists', 400);
    next(err);
  }
};

// PUT /api/sales/categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await prisma.salesCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!category) return error(res, 'Category not found', 404);
    success(res, one(category));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Category not found', 404);
    next(err);
  }
};

// DELETE /api/sales/categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await prisma.salesCategory.delete({ where: { id: req.params.id } });
    if (!result) return error(res, 'Category not found', 404);
    success(res, { message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Category not found', 404);
    next(err);
  }
};

// ── Sales ───────────────────────────────────────────────────────────────────

// GET /api/sales
exports.getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, from, to, paymentMethod } = req.query;
    const where = {};

    if (category) where.categoryId = category;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) {
      where.OR = [
        { categoryName: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
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
      prisma.sale.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], skip, take: Number(limit) }),
      prisma.sale.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/sales/summary
exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    // Today's income
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [sales, todaySales] = await Promise.all([
      prisma.sale.findMany({ where }),
      prisma.sale.findMany({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    ]);

    const total = sales.reduce((s, r) => s + (r.amount || 0), 0);
    const count = sales.length;
    const todayIncome = todaySales.reduce((s, r) => s + (r.amount || 0), 0);
    const todayCount = todaySales.length;

    const byCategoryMap = {};
    for (const r of sales) {
      const key = r.categoryName;
      byCategoryMap[key] = byCategoryMap[key] || { _id: key, total: 0, count: 0 };
      byCategoryMap[key].total += r.amount || 0;
      byCategoryMap[key].count += 1;
    }
    const byCategory = Object.values(byCategoryMap).sort((a, b) => b.total - a.total);

    const byPaymentMethodMap = {};
    for (const r of sales) {
      const key = r.paymentMethod;
      byPaymentMethodMap[key] = byPaymentMethodMap[key] || { _id: key, total: 0, count: 0 };
      byPaymentMethodMap[key].total += r.amount || 0;
      byPaymentMethodMap[key].count += 1;
    }
    const byPaymentMethod = Object.values(byPaymentMethodMap).sort((a, b) => b.total - a.total);

    const byMonth = {};
    for (const r of sales) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = byMonth[key] || { _id: { year: d.getFullYear(), month: d.getMonth() + 1 }, total: 0, count: 0 };
      byMonth[key].total += r.amount || 0;
      byMonth[key].count += 1;
    }
    const monthlyTrend = Object.values(byMonth)
      .sort((a, b) => (b._id.year - a._id.year) || (b._id.month - a._id.month))
      .slice(0, 12);

    success(res, { total, count, todayIncome, todayCount, byCategory, byPaymentMethod, monthlyTrend });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales
exports.createSale = async (req, res, next) => {
  try {
    const cat = await prisma.salesCategory.findUnique({ where: { id: req.body.category } });
    if (!cat) return error(res, 'Category not found', 404);

    const { category, ...rest } = req.body;
    const sale = await prisma.sale.create({
      data: { ...rest, categoryId: category, categoryName: cat.name, createdById: req.user.id },
    });
    success(res, one(sale), 201);
  } catch (err) {
    next(err);
  }
};
// PUT /api/sales/:id
exports.updateSale = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.category) {
      const cat = await prisma.salesCategory.findUnique({ where: { id: data.category } });
      if (!cat) return error(res, 'Category not found', 404);
      data.categoryName = cat.name;
      data.categoryId = data.category;
      delete data.category;
    }
    const sale = await prisma.sale.update({ where: { id: req.params.id }, data });
    if (!sale) return error(res, 'Sale not found', 404);
    success(res, one(sale));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Sale not found', 404);
    next(err);
  }
};

// DELETE /api/sales/:id
exports.deleteSale = async (req, res, next) => {
  try {
    const sale = await prisma.sale.delete({ where: { id: req.params.id } });
    if (!sale) return error(res, 'Sale not found', 404);
    success(res, { message: 'Sale deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Sale not found', 404);
    next(err);
  }
};

// GET /api/sales/report
exports.getReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return error(res, 'Please provide from and to dates', 400);

    const sales = await prisma.sale.findMany({
      where: {
        date: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') },
      },
    });

    const byDay = {};
    const byCategory = {};
    const byPaymentMethod = {};
    let total = 0;
    let count = sales.length;

    for (const r of sales) {
      const amt = r.amount || 0;
      total += amt;
      const dayKey = new Date(r.date).toISOString().slice(0, 10);
      byDay[dayKey] = byDay[dayKey] || { _id: dayKey, total: 0, count: 0 };
      byDay[dayKey].total += amt;
      byDay[dayKey].count += 1;

      byCategory[r.categoryName] = byCategory[r.categoryName] || { _id: r.categoryName, total: 0, count: 0 };
      byCategory[r.categoryName].total += amt;
      byCategory[r.categoryName].count += 1;

      byPaymentMethod[r.paymentMethod] = byPaymentMethod[r.paymentMethod] || { _id: r.paymentMethod, total: 0, count: 0 };
      byPaymentMethod[r.paymentMethod].total += amt;
      byPaymentMethod[r.paymentMethod].count += 1;
    }

    success(res, {
      total,
      count,
      dailyBreakdown: Object.values(byDay).sort((a, b) => (a._id < b._id ? 1 : -1)),
      categoryBreakdown: Object.values(byCategory).sort((a, b) => b.total - a.total),
      paymentBreakdown: Object.values(byPaymentMethod).sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    next(err);
  }
};