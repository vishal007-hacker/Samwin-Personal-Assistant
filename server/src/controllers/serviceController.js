const Service = require('../models/Service');
const { success, error } = require('../utils/responseHelper');

// GET /api/services
exports.getAll = async (req, res, next) => {
  try {
    const { customer, typeOfWork, from, to, search } = req.query;
    const query = {};
    if (customer) query.customer = customer;
    if (typeOfWork) query.typeOfWork = typeOfWork;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    if (search) {
      query.$or = [
        { materialsUsed: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }
    const docs = await Service.find(query)
      .populate('customer', 'name phone email')
      .sort({ date: -1, createdAt: -1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// GET /api/services/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await Service.findById(req.params.id).populate('customer', 'name phone email');
    if (!doc) return error(res, 'Service not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/services
exports.create = async (req, res, next) => {
  try {
    const doc = await Service.create({ ...req.body, createdBy: req.user._id });
    await doc.populate('customer', 'name phone email');
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/services/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('customer', 'name phone email');
    if (!doc) return error(res, 'Service not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/services/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await Service.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Service not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
