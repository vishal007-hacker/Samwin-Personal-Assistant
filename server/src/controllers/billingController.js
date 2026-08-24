const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const PREFIX = { invoice: 'INV', quotation: 'QTN', receipt: 'RCT' };

// GET /api/billing
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    if (type) where.type = type;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    let docs, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const all = await prisma.billing.findMany({ where, orderBy: { createdAt: 'desc' } });
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
        prisma.billing.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
        prisma.billing.count({ where }),
      ]);
    }

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/billing/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.billing.findUnique({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Billing record not found', 404);
    success(res, one(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/billing — auto-generates sequential number (INV/QTN/RCT-0001)
exports.create = async (req, res, next) => {
  try {
    const type = req.body.type;
    if (!PREFIX[type]) return error(res, 'Invalid billing type', 400);

    const doc = await prisma.$transaction(async (tx) => {
      const counter = await tx.counter.upsert({
        where: { key: `billing_${type}` },
        update: { value: { increment: 1 } },
        create: { key: `billing_${type}`, value: 1 },
      });
      return tx.billing.create({
        data: {
          ...req.body,
          number: `${PREFIX[type]}-${String(counter.value).padStart(4, '0')}`,
          sequenceNumber: counter.value,
          createdById: req.user.id,
        },
      });
    });
    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/billing/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.billing.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!doc) return error(res, 'Billing record not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Billing record not found', 404);
    next(err);
  }
};

// DELETE /api/billing/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.billing.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Billing record not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Billing record not found', 404);
    next(err);
  }
};

// GET /api/billing/next-number/:type — preview next number
exports.getNextNumber = async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!PREFIX[type]) {
      return error(res, 'Invalid type', 400);
    }

    const counter = await prisma.counter.findUnique({ where: { key: `billing_${type}` } });
    const nextSeq = (counter?.value || 0) + 1;
    const nextNumber = `${PREFIX[type]}-${String(nextSeq).padStart(4, '0')}`;

    success(res, { nextNumber, nextSeq });
  } catch (err) {
    next(err);
  }
};