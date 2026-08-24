const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const customerSelect = { id: true, name: true, phone: true, email: true };

// GET /api/services
exports.getAll = async (req, res, next) => {
  try {
    const { customer, typeOfWork, from, to, search } = req.query;
    const where = {};
    if (customer) where.customerId = customer;
    if (typeOfWork) where.typeOfWork = typeOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }
    if (search) {
      where.OR = [
        { materialsUsed: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    const docs = await prisma.service.findMany({
      where,
      include: { customer: { select: customerSelect } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// GET /api/services/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: customerSelect } },
    });
    if (!doc) return error(res, 'Service not found', 404);
    success(res, one(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/services
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, createdById: req.user.id };
    if (data.customer) {
      data.customerId = data.customer;
      delete data.customer;
    }
    const doc = await prisma.service.create({ data });
    const populated = await prisma.service.findUnique({
      where: { id: doc.id },
      include: { customer: { select: customerSelect } },
    });
    success(res, one(populated), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/services/:id
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.customer) {
      data.customerId = data.customer;
      delete data.customer;
    }
    const doc = await prisma.service.update({
      where: { id: req.params.id },
      data,
      include: { customer: { select: customerSelect } },
    });
    if (!doc) return error(res, 'Service not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Service not found', 404);
    next(err);
  }
};

// DELETE /api/services/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.service.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Service not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Service not found', 404);
    next(err);
  }
};