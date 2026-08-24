const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const customerSelect = { id: true, name: true, phone: true, email: true, aadhaarNumber: true, panNumber: true, address: true };

// GET /api/vehicle-insurance
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, filter } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    if (status) where.status = status;

    const now = new Date();
    if (filter === 'expiring_soon') {
      const tenDays = new Date();
      tenDays.setDate(tenDays.getDate() + 10);
      where.policyExpiryDate = { gte: now, lte: tenDays };
      where.status = 'active';
    } else if (filter === 'expired') {
      where.policyExpiryDate = { lt: now };
      where.status = 'active';
    }

    let docs, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const all = await prisma.vehicleInsurance.findMany({
        where,
        include: { customer: { select: customerSelect } },
        orderBy: { policyExpiryDate: 'asc' },
      });

      const filtered = all.filter(
        (d) =>
          searchRegex.test(d.customer?.name) ||
          searchRegex.test(d.customer?.phone) ||
          searchRegex.test(d.policyNumber) ||
          searchRegex.test(d.vehicleBrand) ||
          searchRegex.test(d.model)
      );
      total = filtered.length;
      docs = filtered.slice(skip, skip + Number(limit));
    } else {
      [docs, total] = await Promise.all([
        prisma.vehicleInsurance.findMany({
          where,
          include: { customer: { select: customerSelect } },
          orderBy: { policyExpiryDate: 'asc' },
          skip,
          take: Number(limit),
        }),
        prisma.vehicleInsurance.count({ where }),
      ]);
    }

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/vehicle-insurance/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.vehicleInsurance.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: customerSelect } },
    });
    if (!doc) return error(res, 'Vehicle insurance not found', 404);
    success(res, one(doc));
  } catch (err) {
    next(err);
  }
};
// POST /api/vehicle-insurance
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, createdById: req.user.id };
    if (req.files?.rcBook?.[0]) data.rcBookFile = req.files.rcBook[0].filename;
    if (req.files?.oldInsurance?.[0]) data.oldInsuranceFile = req.files.oldInsurance[0].filename;
    if (data.customer) {
      data.customerId = data.customer;
      delete data.customer;
    }
    // multipart/form-data arrives as strings; Prisma (unlike Mongoose) doesn't auto-cast.
    if (data.yearOfManufacturing !== undefined) data.yearOfManufacturing = Number(data.yearOfManufacturing);

    // Auto-set reminder start date to 10 days before expiry (old pre-save hook)
    if (data.policyExpiryDate) {
      const expiry = new Date(data.policyExpiryDate);
      expiry.setDate(expiry.getDate() - 10);
      data.reminderStartDate = expiry;
      data.policyExpiryDate = new Date(data.policyExpiryDate);
    }
    if (data.registrationDate) data.registrationDate = new Date(data.registrationDate);

    const doc = await prisma.vehicleInsurance.create({ data });
    const populated = await prisma.vehicleInsurance.findUnique({
      where: { id: doc.id },
      include: { customer: { select: customerSelect } },
    });
    success(res, one(populated), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/vehicle-insurance/:id
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.customer) {
      data.customerId = data.customer;
      delete data.customer;
    }
    if (req.files?.rcBook?.[0]) data.rcBookFile = req.files.rcBook[0].filename;
    if (req.files?.oldInsurance?.[0]) data.oldInsuranceFile = req.files.oldInsurance[0].filename;
    if (data.yearOfManufacturing !== undefined) data.yearOfManufacturing = Number(data.yearOfManufacturing);
    if (data.policyExpiryDate) data.policyExpiryDate = new Date(data.policyExpiryDate);
    if (data.registrationDate) data.registrationDate = new Date(data.registrationDate);

    const doc = await prisma.vehicleInsurance.update({
      where: { id: req.params.id },
      data,
      include: { customer: { select: customerSelect } },
    });
    if (!doc) return error(res, 'Vehicle insurance not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Vehicle insurance not found', 404);
    next(err);
  }
};

// DELETE /api/vehicle-insurance/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.vehicleInsurance.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Vehicle insurance not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Vehicle insurance not found', 404);
    next(err);
  }
};

// GET /api/vehicle-insurance/due-reminders
exports.getDueReminders = async (req, res, next) => {
  try {
    const now = new Date();
    const docs = await prisma.vehicleInsurance.findMany({
      where: {
        status: 'active',
        reminderStartDate: { lte: now },
        policyExpiryDate: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: { customer: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: { policyExpiryDate: 'asc' },
    });

    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// --- Insurance Types ---

// GET /api/vehicle-insurance/types
exports.getTypes = async (req, res, next) => {
  try {
    const types = await prisma.insuranceType.findMany({ orderBy: { name: 'asc' } });
    success(res, many(types));
  } catch (err) {
    next(err);
  }
};

// POST /api/vehicle-insurance/types
exports.createType = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return error(res, 'Type name is required', 400);
    const existing = await prisma.insuranceType.findUnique({ where: { name: name.trim() } });
    if (existing) return error(res, 'Type already exists', 400);
    const type = await prisma.insuranceType.create({ data: { name: name.trim(), createdById: req.user.id } });
    success(res, one(type), 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Type already exists', 400);
    next(err);
  }
};