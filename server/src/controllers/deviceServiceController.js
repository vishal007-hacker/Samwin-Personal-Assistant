const DeviceService = require('../models/DeviceService');
const DeviceType = require('../models/DeviceType');
const { success, error } = require('../utils/responseHelper');

const DEFAULT_TYPES = ['Mobile', 'Laptop', 'Computer', 'Printer', 'Tablet', 'CCTV', 'Router', 'Other'];

async function seedDefaultTypesIfEmpty(userId) {
  const count = await DeviceType.countDocuments();
  if (count > 0) return;
  await DeviceType.insertMany(DEFAULT_TYPES.map((name) => ({ name, createdBy: userId })));
}

// GET /api/device-service/types
exports.getTypes = async (req, res, next) => {
  try {
    await seedDefaultTypesIfEmpty(req.user._id);
    const docs = await DeviceType.find({}).sort({ name: 1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// POST /api/device-service/types
exports.createType = async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return error(res, 'Name is required', 400);
    const existing = await DeviceType.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) return error(res, 'Type already exists', 400);
    const doc = await DeviceType.create({ name, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/device-service/types/:id
exports.deleteType = async (req, res, next) => {
  try {
    const doc = await DeviceType.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Type not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/device-service?status=&deviceType=&from=&to=&search=
exports.getAll = async (req, res, next) => {
  try {
    const { status, deviceType, from, to, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (deviceType) query.deviceType = deviceType;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { serialNo: { $regex: search, $options: 'i' } },
        { problem: { $regex: search, $options: 'i' } },
      ];
    }
    const docs = await DeviceService.find(query).sort({ date: -1, createdAt: -1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// GET /api/device-service/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await DeviceService.findById(req.params.id);
    if (!doc) return error(res, 'Service entry not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/device-service
exports.create = async (req, res, next) => {
  try {
    const doc = await DeviceService.create({ ...req.body, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/device-service/:id
exports.update = async (req, res, next) => {
  try {
    // Capture old status BEFORE updating so we can detect a transition
    const prev = await DeviceService.findById(req.params.id).lean();
    if (!prev) return error(res, 'Service entry not found', 404);

    const doc = await DeviceService.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return error(res, 'Service entry not found', 404);

    // Respond first; fire-and-forget the AI-composed WhatsApp so the API stays fast.
    success(res, doc);

    if (prev.status !== doc.status) {
      // Run after response. Errors are logged inside the helper; never throw here.
      setImmediate(async () => {
        try {
          const aiDeviceNotify = require('../services/aiDeviceNotify');
          await aiDeviceNotify.notifyDeviceStatus(doc.toObject(), prev.status, doc.status);
        } catch (e) {
          console.error('[deviceService] notify error:', e.message);
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

// DELETE /api/device-service/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await DeviceService.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Service entry not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
