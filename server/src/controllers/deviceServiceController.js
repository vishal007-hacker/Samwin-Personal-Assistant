const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const DEFAULT_TYPES = ['Mobile', 'Laptop', 'Computer', 'Printer', 'Tablet', 'CCTV', 'Router', 'Other'];

async function seedDefaultTypesIfEmpty(userId) {
  const count = await prisma.deviceType.count();
  if (count > 0) return;
  await prisma.deviceType.createMany({
    data: DEFAULT_TYPES.map((name) => ({ name, createdById: userId })),
    skipDuplicates: true,
  });
}

// GET /api/device-service/types
exports.getTypes = async (req, res, next) => {
  try {
    await seedDefaultTypesIfEmpty(req.user.id);
    const docs = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// POST /api/device-service/types
exports.createType = async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return error(res, 'Name is required', 400);
    const existing = await prisma.deviceType.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (existing) return error(res, 'Type already exists', 400);
    const doc = await prisma.deviceType.create({ data: { name, createdById: req.user.id } });
    success(res, one(doc), 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Type already exists', 400);
    next(err);
  }
};

// DELETE /api/device-service/types/:id
exports.deleteType = async (req, res, next) => {
  try {
    const doc = await prisma.deviceType.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Type not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Type not found', 404);
    next(err);
  }
};

// GET /api/device-service?status=&deviceType=&from=&to=&search=
exports.getAll = async (req, res, next) => {
  try {
    const { status, deviceType, from, to, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (deviceType) where.deviceType = deviceType;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { problem: { contains: search, mode: 'insensitive' } },
      ];
    }
    const docs = await prisma.deviceService.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// GET /api/device-service/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.deviceService.findUnique({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Service entry not found', 404);
    success(res, one(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/device-service
exports.create = async (req, res, next) => {
  try {
    const doc = await prisma.deviceService.create({ data: { ...req.body, createdById: req.user.id } });
    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/device-service/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.deviceService.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!doc) return error(res, 'Service entry not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Service entry not found', 404);
    next(err);
  }
};

// DELETE /api/device-service/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.deviceService.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Service entry not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Service entry not found', 404);
    next(err);
  }
};