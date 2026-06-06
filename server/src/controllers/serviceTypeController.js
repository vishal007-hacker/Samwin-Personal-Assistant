const ServiceType = require('../models/ServiceType');
const { success, error } = require('../utils/responseHelper');

// Legacy codes that already live in existing Service docs. We seed these on
// first read so the dropdown still shows them and existing records remain
// selectable.
const LEGACY_DEFAULTS = ['new_installation', 'addon_works', 'service'];

async function ensureSeeded() {
  const count = await ServiceType.countDocuments();
  if (count === 0) {
    await ServiceType.insertMany(
      LEGACY_DEFAULTS.map((name) => ({ name, isDefault: true })),
      { ordered: false }
    ).catch(() => {});
  }
}

exports.getAll = async (req, res, next) => {
  try {
    await ensureSeeded();
    const docs = await ServiceType.find({}).sort({ isDefault: -1, name: 1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return error(res, 'Name is required', 400);
    const existing = await ServiceType.findOne({ name });
    if (existing) return success(res, existing, 200);
    const doc = await ServiceType.create({ name, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    if (err.code === 11000) return error(res, 'Type already exists', 409);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await ServiceType.findById(req.params.id);
    if (!doc) return error(res, 'Type not found', 404);
    if (doc.isDefault) return error(res, 'Cannot delete default type', 400);
    await doc.deleteOne();
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
