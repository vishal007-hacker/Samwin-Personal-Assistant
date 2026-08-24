const prisma = require('../config/prisma');
const { getNextPremiumDate } = require('../utils/dateHelpers');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, customer, policy, startDate, endDate } = req.query;
    const where = {};

    if (customer) where.customerId = customer;
    if (policy) where.policyId = policy;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          policy: { select: { id: true, policyNumber: true, premiumAmount: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getPolicyPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { policyId: req.params.policyId },
      orderBy: { paymentDate: 'desc' },
    });
    success(res, many(payments));
  } catch (err) {
    next(err);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const { policy, customer, ...rest } = req.body;
    const payment = await prisma.payment.create({
      data: {
        ...rest,
        policyId: policy,
        customerId: customer,
        recordedById: req.user.id,
      },
    });

    // Advance the policy's next premium date
    const policyRow = await prisma.policy.findUnique({ where: { id: policy } });
    if (policyRow && policyRow.status === 'active') {
      const nextDate = getNextPremiumDate(policyRow.nextPremiumDate, policyRow.premiumFrequency);
      const data = { nextPremiumDate: nextDate };
      if (nextDate > policyRow.maturityDate) {
        data.status = 'matured';
      }
      await prisma.policy.update({ where: { id: policyRow.id }, data });
    }

    const populated = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        policy: { select: { id: true, policyNumber: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    success(res, one(populated), 201);
  } catch (err) {
    next(err);
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.policy) {
      data.policyId = data.policy;
      delete data.policy;
    }
    if (data.customer) {
      data.customerId = data.customer;
      delete data.customer;
    }
    const payment = await prisma.payment.update({ where: { id: req.params.id }, data });
    if (!payment) return error(res, 'Payment not found', 404);
    success(res, one(payment));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Payment not found', 404);
    next(err);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.delete({ where: { id: req.params.id } });
    if (!payment) return error(res, 'Payment not found', 404);
    success(res, { message: 'Payment deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Payment not found', 404);
    next(err);
  }
};