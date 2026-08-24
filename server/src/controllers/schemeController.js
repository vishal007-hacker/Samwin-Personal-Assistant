const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

exports.getSchemes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, company, search, activeOnly } = req.query;
    const where = {};

    if (type) where.type = type;
    if (company) where.company = { contains: company, mode: 'insensitive' };
    if (activeOnly === 'true') where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      prisma.scheme.findMany({ where, orderBy: [{ type: 'asc' }, { name: 'asc' }], skip, take: Number(limit) }),
      prisma.scheme.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getScheme = async (req, res, next) => {
  try {
    const scheme = await prisma.scheme.findUnique({ where: { id: req.params.id } });
    if (!scheme) return error(res, 'Scheme not found', 404);
    success(res, one(scheme));
  } catch (err) {
    next(err);
  }
};

exports.createScheme = async (req, res, next) => {
  try {
    const scheme = await prisma.scheme.create({ data: { ...req.body, createdById: req.user.id } });
    success(res, one(scheme), 201);
  } catch (err) {
    next(err);
  }
};

exports.updateScheme = async (req, res, next) => {
  try {
    const scheme = await prisma.scheme.update({ where: { id: req.params.id }, data: req.body });
    if (!scheme) return error(res, 'Scheme not found', 404);
    success(res, one(scheme));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Scheme not found', 404);
    next(err);
  }
};

exports.deleteScheme = async (req, res, next) => {
  try {
    const scheme = await prisma.scheme.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    if (!scheme) return error(res, 'Scheme not found', 404);
    success(res, { message: 'Scheme deactivated' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Scheme not found', 404);
    next(err);
  }
};

exports.getSchemeTypes = async (req, res, next) => {
  try {
    const typeRows = await prisma.scheme.findMany({
      where: { isActive: true },
      distinct: ['type'],
      select: { type: true },
    });
    const companyRows = await prisma.scheme.findMany({
      where: { isActive: true },
      distinct: ['company'],
      select: { company: true },
    });
    success(res, {
      types: typeRows.map((r) => r.type),
      companies: companyRows.map((r) => r.company),
    });
  } catch (err) {
    next(err);
  }
};