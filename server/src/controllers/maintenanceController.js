const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// ── Products ────────────────────────────────────────────────────────────────

// GET /api/maintenance/products
exports.getProducts = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const products = await prisma.maintenanceProduct.findMany({
      where,
      orderBy: [{ nextMaintenanceDate: 'asc' }, { name: 'asc' }],
    });

    // Fetch all records for these products once and aggregate last-service stats.
    const productIds = products.map((p) => p.id);
    const records = productIds.length
      ? await prisma.maintenanceRecord.findMany({ where: { productId: { in: productIds } } })
      : [];

    const statsByProduct = {};
    for (const r of records) {
      const s = (statsByProduct[r.productId] = statsByProduct[r.productId] || { count: 0, total: 0 });
      s.count += 1;
      s.total += (r.cost || 0);
      if (!s.lastDate || new Date(r.date) > new Date(s.lastDate)) {
        s.lastDate = r.date;
        s.lastCost = r.cost;
        s.lastWorkDone = r.workDone;
      }
    }

    const enriched = products.map((p) => {
      const stats = statsByProduct[p.id] || {};
      return {
        ...p,
        _id: p.id,
        lastServicedDate: stats.lastDate || null,
        lastCost: stats.lastCost || 0,
        lastWorkDone: stats.lastWorkDone || '',
        totalSpent: stats.total || 0,
        serviceCount: stats.count || 0,
      };
    });

    success(res, many(enriched));
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
    const product = await prisma.maintenanceProduct.create({
      data: { ...req.body, createdById: req.user.id },
    });
    success(res, one(product), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/maintenance/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await prisma.maintenanceProduct.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!product) return error(res, 'Product not found', 404);
    success(res, one(product));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Product not found', 404);
    next(err);
  }
};

// DELETE /api/maintenance/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.maintenanceProduct.findUnique({ where: { id: req.params.id } });
    if (!product) return error(res, 'Product not found', 404);
    // Cascade: delete all records for this product
    await prisma.maintenanceRecord.deleteMany({ where: { productId: product.id } });
    await prisma.maintenanceProduct.delete({ where: { id: product.id } });
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
    const where = {};
    if (product) where.productId = product;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }
    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: { product: { select: { id: true, name: true, category: true, location: true, frequencyDays: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    success(res, many(records));
  } catch (err) {
    next(err);
  }
};

// POST /api/maintenance/records
exports.createRecord = async (req, res, next) => {
  try {
    const data = { ...req.body, createdById: req.user.id };
    if (data.product) {
      data.productId = data.product;
      delete data.product;
    }
    const record = await prisma.maintenanceRecord.create({ data });

    // Update the product's nextMaintenanceDate
    const product = await prisma.maintenanceProduct.findUnique({ where: { id: req.body.product } });
    if (product) {
      let nextDue = req.body.nextDueDate ? new Date(req.body.nextDueDate) : null;
      if (!nextDue) {
        const days = product.frequencyDays || 30;
        const base = new Date(req.body.date || Date.now());
        nextDue = new Date(base);
        nextDue.setDate(nextDue.getDate() + days);
      }
      await prisma.maintenanceProduct.update({
        where: { id: product.id },
        data: { nextMaintenanceDate: nextDue },
      });
    }

    const populated = await prisma.maintenanceRecord.findUnique({
      where: { id: record.id },
      include: { product: { select: { id: true, name: true, category: true, location: true, frequencyDays: true } } },
    });
    success(res, one(populated), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/maintenance/records/:id
exports.updateRecord = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.product) {
      data.productId = data.product;
      delete data.product;
    }
    const record = await prisma.maintenanceRecord.update({
      where: { id: req.params.id },
      data,
      include: { product: { select: { id: true, name: true, category: true, location: true, frequencyDays: true } } },
    });
    if (!record) return error(res, 'Record not found', 404);
    success(res, one(record));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    next(err);
  }
};

// DELETE /api/maintenance/records/:id
exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await prisma.maintenanceRecord.delete({ where: { id: req.params.id } });
    if (!record) return error(res, 'Record not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    next(err);
  }
};