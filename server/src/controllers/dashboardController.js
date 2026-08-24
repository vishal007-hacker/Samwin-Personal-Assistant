const prisma = require('../config/prisma');
const { success } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    const [totalPolicies, activePolicies, overdueCount, totalCustomers, monthlyCollection,
      totalVehicleInsurance, vehicleExpiringSoon, vehicleExpired] =
      await Promise.all([
        prisma.policy.count(),
        prisma.policy.count({ where: { status: 'active' } }),
        prisma.policy.count({ where: { status: 'active', nextPremiumDate: { lt: now } } }),
        prisma.customer.count(),
        prisma.payment.aggregate({
          where: { paymentDate: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        prisma.vehicleInsurance.count({ where: { status: 'active' } }),
        prisma.vehicleInsurance.count({ where: { status: 'active', policyExpiryDate: { gte: now, lte: tenDaysFromNow } } }),
        prisma.vehicleInsurance.count({ where: { status: 'active', policyExpiryDate: { lt: now } } }),
      ]);

    success(res, {
      totalPolicies,
      activePolicies,
      overdueCount,
      totalCustomers,
      monthlyCollection: monthlyCollection._sum.amount || 0,
      totalVehicleInsurance,
      vehicleExpiringSoon,
      vehicleExpired,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUpcomingReminders = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));

    const policies = await prisma.policy.findMany({
      where: {
        status: 'active',
        nextPremiumDate: { gte: now, lte: futureDate },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        scheme: { select: { id: true, name: true, type: true, company: true } },
      },
      orderBy: { nextPremiumDate: 'asc' },
      take: 50,
    });

    success(res, many(policies));
  } catch (err) {
    next(err);
  }
};

exports.getOverdue = async (req, res, next) => {
  try {
    const now = new Date();
    const policies = await prisma.policy.findMany({
      where: { status: 'active', nextPremiumDate: { lt: now } },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        scheme: { select: { id: true, name: true, type: true, company: true } },
      },
      orderBy: { nextPremiumDate: 'asc' },
      take: 50,
    });

    success(res, many(policies));
  } catch (err) {
    next(err);
  }
};

exports.getRecentPolicies = async (req, res, next) => {
  try {
    const policies = await prisma.policy.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        scheme: { select: { id: true, name: true, type: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    success(res, many(policies));
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/vehicle-expiring — vehicle insurance expiring within 10 days + expired
exports.getVehicleExpiring = async (req, res, next) => {
  try {
    const now = new Date();
    const tenDays = new Date();
    tenDays.setDate(tenDays.getDate() + 10);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const docs = await prisma.vehicleInsurance.findMany({
      where: {
        status: 'active',
        policyExpiryDate: { gte: thirtyDaysAgo, lte: tenDays },
      },
      include: { customer: { select: { id: true, name: true, phone: true, aadhaarNumber: true, panNumber: true } } },
      orderBy: { policyExpiryDate: 'asc' },
      take: 20,
    });

    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/dashboard/reset — delete all data (admin only, FK-safe order)
exports.resetAllData = async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.credit.deleteMany({});
    await prisma.policy.deleteMany({});
    await prisma.vehicleInsurance.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.scheme.deleteMany({});
    success(res, { message: 'All data has been reset successfully' });
  } catch (err) {
    next(err);
  }
};