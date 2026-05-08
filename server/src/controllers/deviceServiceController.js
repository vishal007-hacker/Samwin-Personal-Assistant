const DeviceService = require('../models/DeviceService');
const { success, error } = require('../utils/responseHelper');

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
    const doc = await DeviceService.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return error(res, 'Service entry not found', 404);
    success(res, doc);
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
