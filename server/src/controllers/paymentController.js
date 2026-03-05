const Payment = require('../models/Payment');
const Policy = require('../models/Policy');
const { getNextPremiumDate } = require('../utils/dateHelpers');
const { success, paginated, error } = require('../utils/responseHelper');

exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, customer, policy, startDate, endDate } = req.query;
    const query = {};

    if (customer) query.customer = customer;
    if (policy) query.policy = policy;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Payment.find(query)
        .populate('policy', 'policyNumber premiumAmount')
        .populate('customer', 'name phone')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getPolicyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ policy: req.params.policyId })
      .sort({ paymentDate: -1 });
    success(res, payments);
  } catch (err) {
    next(err);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const payment = await Payment.create({ ...req.body, recordedBy: req.user._id });

    // Advance the policy's next premium date
    const policy = await Policy.findById(req.body.policy);
    if (policy && policy.status === 'active') {
      const nextDate = getNextPremiumDate(policy.nextPremiumDate, policy.premiumFrequency);
      if (nextDate > policy.maturityDate) {
        policy.status = 'matured';
      }
      policy.nextPremiumDate = nextDate;
      await policy.save();
    }

    const populated = await Payment.findById(payment._id)
      .populate('policy', 'policyNumber')
      .populate('customer', 'name phone');

    success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!payment) return error(res, 'Payment not found', 404);
    success(res, payment);
  } catch (err) {
    next(err);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return error(res, 'Payment not found', 404);
    success(res, { message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
};
