const Attendance = require('../models/Attendance');
const { success, error } = require('../utils/responseHelper');

// GET /api/attendance?employee=xxx&from=&to=
exports.getAll = async (req, res, next) => {
  try {
    const { employee, from, to, status } = req.query;
    const query = {};
    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    const docs = await Attendance.find(query)
      .populate('employee', 'name phone designation')
      .sort({ date: -1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await Attendance.findById(req.params.id).populate('employee', 'name phone designation');
    if (!doc) return error(res, 'Attendance not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance
exports.create = async (req, res, next) => {
  try {
    // Normalize date to start of day
    const dateOnly = new Date(req.body.date);
    dateOnly.setHours(0, 0, 0, 0);
    req.body.date = dateOnly;

    const doc = await Attendance.create({ ...req.body, createdBy: req.user._id });
    await doc.populate('employee', 'name phone designation');
    success(res, doc, 201);
  } catch (err) {
    if (err.code === 11000) {
      return error(res, 'Attendance already exists for this employee on this date', 400);
    }
    next(err);
  }
};

// PUT /api/attendance/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('employee', 'name phone designation');
    if (!doc) return error(res, 'Attendance not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/attendance/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await Attendance.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Attendance not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
