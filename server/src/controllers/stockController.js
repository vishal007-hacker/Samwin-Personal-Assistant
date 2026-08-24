const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/stock — list with pagination, search, filter
exports.getStocks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      brand,
      category,
      sortBy = 'uniqueCode',
      sortOrder = 'asc',
    } = req.query;

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [docs, total] = await Promise.all([
      prisma.stock.findMany({ where, orderBy, skip, take: Number(limit) }),
      prisma.stock.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/stock/:id
exports.getStock = async (req, res, next) => {
  try {
    const stock = await prisma.stock.findUnique({ where: { id: req.params.id } });
    if (!stock) return error(res, 'Stock item not found', 404);
    success(res, one(stock));
  } catch (err) {
    next(err);
  }
};

// POST /api/stock — add new stock item (auto-increments uniqueCode)
exports.createStock = async (req, res, next) => {
  try {
    const counter = await prisma.counter.upsert({
      where: { key: 'stockCode' },
      update: { value: { increment: 1 } },
      create: { key: 'stockCode', value: 1 },
    });

    const stock = await prisma.stock.create({
      data: { ...req.body, uniqueCode: counter.value, createdById: req.user.id },
    });
    success(res, one(stock), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/stock/:id — update stock details
exports.updateStock = async (req, res, next) => {
  try {
    const stock = await prisma.stock.findUnique({ where: { id: req.params.id } });
    if (!stock) return error(res, 'Stock item not found', 404);
    if (stock.status === 'sold') return error(res, 'Cannot edit a sold item', 400);

    const updated = await prisma.stock.update({ where: { id: stock.id }, data: req.body });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

// PUT /api/stock/:id/sell — mark as sold
exports.sellStock = async (req, res, next) => {
  try {
    const stock = await prisma.stock.findUnique({ where: { id: req.params.id } });
    if (!stock) return error(res, 'Stock item not found', 404);
    if (stock.status === 'sold') return error(res, 'Item already sold', 400);

    const { customerName, contactNumber, finalPrice, complements } = req.body;
    const updated = await prisma.stock.update({
      where: { id: stock.id },
      data: { status: 'sold', soldTo: { customerName, contactNumber, finalPrice, complements }, soldAt: new Date() },
    });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/stock/:id
exports.deleteStock = async (req, res, next) => {
  try {
    const stock = await prisma.stock.delete({ where: { id: req.params.id } });
    if (!stock) return error(res, 'Stock item not found', 404);
    success(res, { message: 'Stock item deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Stock item not found', 404);
    next(err);
  }
};

// GET /api/stock/brands — distinct brand list
exports.getBrands = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.category) where.category = req.query.category;
    const rows = await prisma.stock.findMany({ where, distinct: ['brand'], select: { brand: true } });
    const brands = rows.map((r) => r.brand).filter(Boolean);
    success(res, brands.sort());
  } catch (err) {
    next(err);
  }
};

// GET /api/stock/next-code — peek at next unique code without incrementing
exports.getNextCode = async (req, res, next) => {
  try {
    const c = await prisma.counter.findUnique({ where: { key: 'stockCode' } });
    success(res, { nextCode: (c?.value || 0) + 1 });
  } catch (err) {
    next(err);
  }
};

// GET /api/stock/report/summary — purchase/sell summary
exports.getReport = async (req, res, next) => {
  try {
    const { from, to, brand, status, category } = req.query;
    const where = {};
    if (category) where.category = category;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
    }

    const items = await prisma.stock.findMany({ where, orderBy: { createdAt: 'desc' } });

    const totalPurchase = items.reduce((s, i) => s + (i.purchasePrice || 0), 0);
    const soldItems = items.filter((i) => i.status === 'sold');
    const totalSold = soldItems.reduce((s, i) => s + (i.soldTo?.finalPrice || 0), 0);
    const totalProfit = totalSold - soldItems.reduce((s, i) => s + (i.purchasePrice || 0), 0);
    const inStockCount = items.filter((i) => i.status === 'in_stock').length;

    success(res, {
      items: many(items),
      summary: {
        totalItems: items.length,
        inStockCount,
        soldCount: soldItems.length,
        totalPurchase,
        totalSold,
        totalProfit,
      },
    });
  } catch (err) {
    next(err);
  }
};