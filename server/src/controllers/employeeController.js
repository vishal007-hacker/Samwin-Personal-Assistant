const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/employees
exports.getAll = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;
    if (active === 'false') query.isActive = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }
    const docs = await Employee.find(query).sort({ name: 1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await Employee.findById(req.params.id);
    if (!doc) return error(res, 'Employee not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/employees
exports.create = async (req, res, next) => {
  try {
    const doc = await Employee.create({ ...req.body, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/employees/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return error(res, 'Employee not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/employees/:id
exports.remove = async (req, res, next) => {
  try {
    await Attendance.deleteMany({ employee: req.params.id });
    const doc = await Employee.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Employee not found', 404);
    success(res, { message: 'Employee and attendance records deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id/salary-report
exports.salaryReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const emp = await Employee.findById(req.params.id);
    if (!emp) return error(res, 'Employee not found', 404);

    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const attendance = await Attendance.find({
      employee: req.params.id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

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
      employee: emp,
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
      attendance,
    });
  } catch (err) {
    next(err);
  }
};
