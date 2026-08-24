const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { panNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [docs, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy, skip, take: Number(limit) }),
      prisma.customer.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) return error(res, 'Customer not found', 404);
    success(res, one(customer));
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.create({ data: { ...req.body, createdById: req.user.id } });
    success(res, one(customer), 201);
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    if (!customer) return error(res, 'Customer not found', 404);
    success(res, one(customer));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Customer not found', 404);
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.delete({ where: { id: req.params.id } });
    if (!customer) return error(res, 'Customer not found', 404);
    success(res, { message: 'Customer deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Customer not found', 404);
    next(err);
  }
};

exports.searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return success(res, []);

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true, aadhaarNumber: true, panNumber: true },
      take: 20,
    });

    success(res, many(customers));
  } catch (err) {
    next(err);
  }
};