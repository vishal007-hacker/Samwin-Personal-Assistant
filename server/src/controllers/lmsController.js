const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/lms
exports.getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const docs = await prisma.lMS.findMany({ where, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// GET /api/lms/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.lMS.findUnique({ where: { id: req.params.id } });
    if (!doc) return error(res, 'LMS entry not found', 404);
    success(res, one(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/lms
exports.create = async (req, res, next) => {
  try {
    const doc = await prisma.lMS.create({ data: { ...req.body, createdById: req.user.id } });
    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/lms/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.lMS.update({ where: { id: req.params.id }, data: req.body });
    if (!doc) return error(res, 'LMS entry not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'LMS entry not found', 404);
    next(err);
  }
};

// DELETE /api/lms/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.lMS.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'LMS entry not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'LMS entry not found', 404);
    next(err);
  }
};