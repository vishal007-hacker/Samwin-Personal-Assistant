const prisma = require('../config/prisma');
const { success } = require('../utils/responseHelper');

exports.premiumCollection = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({ where });

    const byDay = {};
    for (const p of payments) {
      const amt = p.amount || 0;
      const key = new Date(p.paymentDate).toISOString().slice(0, 10);
      byDay[key] = byDay[key] || { _id: key, totalAmount: 0, count: 0 };
      byDay[key].totalAmount += amt;
      byDay[key].count += 1;
    }

    const report = Object.values(byDay).sort((a, b) => (a._id < b._id ? 1 : -1));
    const totalAmount = report.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalPayments = report.reduce((sum, r) => sum + r.count, 0);

    success(res, { report, summary: { totalAmount, totalPayments } });
  } catch (err) {
    next(err);
  }
};

exports.policyWise = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({ where });

    const grouped = {};
    for (const p of payments) {
      const g = (grouped[p.policyId] = grouped[p.policyId] || { totalPaid: 0, paymentCount: 0, lastPayment: null });
      g.totalPaid += p.amount || 0;
      g.paymentCount += 1;
      if (!g.lastPayment || new Date(p.paymentDate) > new Date(g.lastPayment)) {
        g.lastPayment = p.paymentDate;
      }
    }

    const policyIds = Object.keys(grouped);
    const policies = await prisma.policy.findMany({
      where: { id: { in: policyIds } },
      include: { customer: { select: { id: true, name: true } } },
    });

    const report = policies.map((p) => {
      const g = grouped[p.id] || { totalPaid: 0, paymentCount: 0, lastPayment: null };
      return {
        _id: p.id,
        policyNumber: p.policyNumber,
        customerName: p.customer?.name,
        premiumAmount: p.premiumAmount,
        totalPaid: g.totalPaid,
        paymentCount: g.paymentCount,
        lastPayment: g.lastPayment,
        status: p.status,
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);

    success(res, report);
  } catch (err) {
    next(err);
  }
};

exports.customerWise = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({});

    const grouped = {};
    for (const p of payments) {
      const g = (grouped[p.customerId] = grouped[p.customerId] || { totalPaid: 0, paymentCount: 0 });
      g.totalPaid += p.amount || 0;
      g.paymentCount += 1;
    }

    const customerIds = Object.keys(grouped);
    const [customers, policies] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true } }),
      prisma.policy.findMany({ where: { customerId: { in: customerIds } }, select: { customerId: true } }),
    ]);

    const policyCountByCustomer = {};
    for (const p of policies) {
      policyCountByCustomer[p.customerId] = (policyCountByCustomer[p.customerId] || 0) + 1;
    }

    const report = customers.map((c) => {
      const g = grouped[c.id];
      return {
        _id: c.id,
        customerName: c.name,
        phone: c.phone,
        totalPaid: g.totalPaid,
        paymentCount: g.paymentCount,
        policyCount: policyCountByCustomer[c.id] || 0,
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);

    success(res, report);
  } catch (err) {
    next(err);
  }
};

exports.schemeWise = async (req, res, next) => {
  try {
    const policies = await prisma.policy.findMany({});

    const grouped = {};
    for (const p of policies) {
      const g = (grouped[p.schemeId] = grouped[p.schemeId] || { policyCount: 0, totalSumAssured: 0, totalPremium: 0 });
      g.policyCount += 1;
      g.totalSumAssured += p.sumAssured || 0;
      g.totalPremium += p.premiumAmount || 0;
    }

    const schemeIds = Object.keys(grouped);
    const schemes = await prisma.scheme.findMany({ where: { id: { in: schemeIds } } });

    const report = schemes.map((s) => {
      const g = grouped[s.id];
      return {
        _id: s.id,
        schemeName: s.name,
        schemeType: s.type,
        company: s.company,
        policyCount: g.policyCount,
        totalSumAssured: g.totalSumAssured,
        totalPremium: g.totalPremium,
      };
    }).sort((a, b) => b.policyCount - a.policyCount);

    success(res, report);
  } catch (err) {
    next(err);
  }
};