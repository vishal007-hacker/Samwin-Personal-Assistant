const Policy = require('../models/Policy');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Scheme = require('../models/Scheme');
const Credit = require('../models/Credit');
const Notification = require('../models/Notification');
const { success } = require('../utils/responseHelper');

exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPolicies, activePolicies, overdueCount, totalCustomers, monthlyCollection] =
      await Promise.all([
        Policy.countDocuments(),
        Policy.countDocuments({ status: 'active' }),
        Policy.countDocuments({ status: 'active', nextPremiumDate: { $lt: now } }),
        Customer.countDocuments(),
        Payment.aggregate([
          { $match: { paymentDate: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    success(res, {
      totalPolicies,
      activePolicies,
      overdueCount,
      totalCustomers,
      monthlyCollection: monthlyCollection[0]?.total || 0,
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

    const policies = await Policy.find({
      status: 'active',
      nextPremiumDate: { $gte: now, $lte: futureDate },
    })
      .populate('customer', 'name phone')
      .populate('scheme', 'name type company')
      .sort({ nextPremiumDate: 1 })
      .limit(50);

    success(res, policies);
  } catch (err) {
    next(err);
  }
};

exports.getOverdue = async (req, res, next) => {
  try {
    const now = new Date();
    const policies = await Policy.find({
      status: 'active',
      nextPremiumDate: { $lt: now },
    })
      .populate('customer', 'name phone')
      .populate('scheme', 'name type company')
      .sort({ nextPremiumDate: 1 })
      .limit(50);

    success(res, policies);
  } catch (err) {
    next(err);
  }
};

exports.getRecentPolicies = async (req, res, next) => {
  try {
    const policies = await Policy.find()
      .populate('customer', 'name phone')
      .populate('scheme', 'name type company')
      .sort({ createdAt: -1 })
      .limit(10);

    success(res, policies);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/dashboard/reset — delete all data (admin only)
exports.resetAllData = async (req, res, next) => {
  try {
    await Promise.all([
      Customer.deleteMany({}),
      Scheme.deleteMany({}),
      Policy.deleteMany({}),
      Payment.deleteMany({}),
      Credit.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    success(res, { message: 'All data has been reset successfully' });
  } catch (err) {
    next(err);
  }
};
