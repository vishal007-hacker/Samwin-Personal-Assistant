const LMS = require('../models/LMS');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/lms
exports.getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const docs = await LMS.find(query).sort({ order: 1, createdAt: -1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// GET /api/lms/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await LMS.findById(req.params.id);
    if (!doc) return error(res, 'LMS entry not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/lms
exports.create = async (req, res, next) => {
  try {
    const doc = await LMS.create({ ...req.body, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/lms/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await LMS.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return error(res, 'LMS entry not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lms/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await LMS.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'LMS entry not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
