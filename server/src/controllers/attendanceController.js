const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const employeeSelect = { id: true, name: true, phone: true, designation: true };

// GET /api/attendance?employee=xxx&from=&to=
exports.getAll = async (req, res, next) => {
  try {
    const { employee, from, to, status } = req.query;
    const where = {};
    if (employee) where.employeeId = employee;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }
    const docs = await prisma.attendance.findMany({
      where,
      include: { employee: { select: employeeSelect } },
      orderBy: { date: 'desc' },
    });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: { employee: { select: employeeSelect } },
    });
    if (!doc) return error(res, 'Attendance not found', 404);
    success(res, one(doc));
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

    const data = { ...req.body, date: dateOnly, createdById: req.user.id };
    if (data.employee) {
      data.employeeId = data.employee;
      delete data.employee;
    }

    const doc = await prisma.attendance.create({ data });
    const populated = await prisma.attendance.findUnique({
      where: { id: doc.id },
      include: { employee: { select: employeeSelect } },
    });
    success(res, one(populated), 201);
  } catch (err) {
    if (err.code === 'P2002') {
      return error(res, 'Attendance already exists for this employee on this date', 400);
    }
    next(err);
  }
};

// PUT /api/attendance/:id
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.employee) {
      data.employeeId = data.employee;
      delete data.employee;
    }
    const doc = await prisma.attendance.update({
      where: { id: req.params.id },
      data,
      include: { employee: { select: employeeSelect } },
    });
    if (!doc) return error(res, 'Attendance not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Attendance not found', 404);
    next(err);
  }
};

// DELETE /api/attendance/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.attendance.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Attendance not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Attendance not found', 404);
    next(err);
  }
};