const Payment = require('../models/Payment');
const Policy = require('../models/Policy');
const { success } = require('../utils/responseHelper');

exports.premiumCollection = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.paymentDate = {};
      if (startDate) match.paymentDate.$gte = new Date(startDate);
      if (endDate) match.paymentDate.$lte = new Date(endDate);
    }

    const report = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

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
    const match = {};
    if (startDate || endDate) {
      match.paymentDate = {};
      if (startDate) match.paymentDate.$gte = new Date(startDate);
      if (endDate) match.paymentDate.$lte = new Date(endDate);
    }

    const report = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$policy',
          totalPaid: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          lastPayment: { $max: '$paymentDate' },
        },
      },
      {
        $lookup: {
          from: 'policies',
          localField: '_id',
          foreignField: '_id',
          as: 'policy',
        },
      },
      { $unwind: '$policy' },
      {
        $lookup: {
          from: 'customers',
          localField: 'policy.customer',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          policyNumber: '$policy.policyNumber',
          customerName: '$customer.name',
          premiumAmount: '$policy.premiumAmount',
          totalPaid: 1,
          paymentCount: 1,
          lastPayment: 1,
          status: '$policy.status',
        },
      },
      { $sort: { totalPaid: -1 } },
    ]);

    success(res, report);
  } catch (err) {
    next(err);
  }
};

exports.customerWise = async (req, res, next) => {
  try {
    const report = await Payment.aggregate([
      {
        $group: {
          _id: '$customer',
          totalPaid: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $lookup: {
          from: 'policies',
          localField: '_id',
          foreignField: 'customer',
          as: 'policies',
        },
      },
      {
        $project: {
          customerName: '$customer.name',
          phone: '$customer.phone',
          totalPaid: 1,
          paymentCount: 1,
          policyCount: { $size: '$policies' },
        },
      },
      { $sort: { totalPaid: -1 } },
    ]);

    success(res, report);
  } catch (err) {
    next(err);
  }
};

exports.schemeWise = async (req, res, next) => {
  try {
    const report = await Policy.aggregate([
      {
        $group: {
          _id: '$scheme',
          policyCount: { $sum: 1 },
          totalSumAssured: { $sum: '$sumAssured' },
          totalPremium: { $sum: '$premiumAmount' },
        },
      },
      {
        $lookup: {
          from: 'schemes',
          localField: '_id',
          foreignField: '_id',
          as: 'scheme',
        },
      },
      { $unwind: '$scheme' },
      {
        $project: {
          schemeName: '$scheme.name',
          schemeType: '$scheme.type',
          company: '$scheme.company',
          policyCount: 1,
          totalSumAssured: 1,
          totalPremium: 1,
        },
      },
      { $sort: { policyCount: -1 } },
    ]);

    success(res, report);
  } catch (err) {
    next(err);
  }
};
