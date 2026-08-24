const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/employees
exports.getAll = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const where = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }
    const docs = await prisma.employee.findMany({ where, orderBy: { name: 'asc' } });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Employee not found', 404);
    success(res, one(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/employees
exports.create = async (req, res, next) => {
  try {
    const doc = await prisma.employee.create({ data: { ...req.body, createdById: req.user.id } });
    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/employees/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.employee.update({ where: { id: req.params.id }, data: req.body });
    if (!doc) return error(res, 'Employee not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Employee not found', 404);
    next(err);
  }
};

// DELETE /api/employees/:id
exports.remove = async (req, res, next) => {
  try {
    await prisma.attendance.deleteMany({ where: { employeeId: req.params.id } });
    const doc = await prisma.employee.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Employee not found', 404);
    success(res, { message: 'Employee and attendance records deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Employee not found', 404);
    next(err);
  }
};

// GET /api/employees/:id/salary-report
exports.salaryReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!emp) return error(res, 'Employee not found', 404);

    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: req.params.id,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const totalDays = attendance.length;
    const presentDays = attendance.filter((a) => a.status === 'present').length;
    const halfDays = attendance.filter((a) => a.status === 'half-day').length;
    const absentDays = attendance.filter((a) => a.status === 'absent').length;
    const leaveDays = attendance.filter((a) => a.status === 'leave').length;
    const totalExpenses = attendance.reduce((s, a) => s + (a.expenses || 0), 0);
    const workingDays = presentDays + halfDays * 0.5;
    const daysInMonth = new Date(y, m, 0).getDate();
    const perDaySalary = emp.salary / daysInMonth;
    const earnedSalary = Math.round(perDaySalary * workingDays);

    success(res, {
      employee: one(emp),
      month: m,
      year: y,
      daysInMonth,
      totalDays,
      presentDays,
      halfDays,
      absentDays,
      leaveDays,
      workingDays,
      totalExpenses,
      monthlySalary: emp.salary,
      perDaySalary: Math.round(perDaySalary),
      earnedSalary,
      netPayable: earnedSalary + totalExpenses,
      attendance: many(attendance),
    });
  } catch (err) {
    next(err);
  }
};