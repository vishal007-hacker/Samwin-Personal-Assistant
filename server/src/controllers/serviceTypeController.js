const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// Legacy codes that already live in existing Service docs. We seed these on
// first read so the dropdown still shows them and existing records remain
// selectable.
const LEGACY_DEFAULTS = ['new_installation', 'addon_works', 'service'];

async function ensureSeeded() {
  const count = await prisma.serviceType.count();
  if (count === 0) {
    await prisma.serviceType
      .createMany({
        data: LEGACY_DEFAULTS.map((name) => ({ name, isDefault: true })),
        skipDuplicates: true,
      })
      .catch(() => {});
  }
}

exports.getAll = async (req, res, next) => {
  try {
    await ensureSeeded();
    const docs = await prisma.serviceType.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return error(res, 'Name is required', 400);
    const existing = await prisma.serviceType.findUnique({ where: { name } });
    if (existing) return success(res, one(existing), 200);
    const doc = await prisma.serviceType.create({ data: { name, createdById: req.user.id } });
    success(res, one(doc), 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Type already exists', 409);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.serviceType.findUnique({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Type not found', 404);
    if (doc.isDefault) return error(res, 'Cannot delete default type', 400);
    await prisma.serviceType.delete({ where: { id: doc.id } });
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Type not found', 404);
    next(err);
  }
};