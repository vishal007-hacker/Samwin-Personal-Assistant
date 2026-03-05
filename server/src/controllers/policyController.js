const Policy = require('../models/Policy');
const { getNextPremiumDate } = require('../utils/dateHelpers');
const { success, paginated, error } = require('../utils/responseHelper');

exports.getPolicies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, customer, scheme, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};

    if (customer) query.customer = customer;
    if (scheme) query.scheme = scheme;
    if (status) query.status = status;
    if (search) query.policyNumber = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      Policy.find(query)
        .populate('customer', 'name phone email')
        .populate('scheme', 'name type company')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Policy.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getPolicy = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id)
      .populate('customer')
      .populate('scheme');
    if (!policy) return error(res, 'Policy not found', 404);
    success(res, policy);
  } catch (err) {
    next(err);
  }
};

exports.createPolicy = async (req, res, next) => {
  try {
    const { startDate, premiumFrequency } = req.body;
    const nextPremiumDate = getNextPremiumDate(new Date(startDate), premiumFrequency);

    const policy = await Policy.create({
      ...req.body,
      nextPremiumDate,
      createdBy: req.user._id,
    });

    const populated = await Policy.findById(policy._id)
      .populate('customer', 'name phone')
      .populate('scheme', 'name type company');

    success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    if (req.body.startDate && req.body.premiumFrequency) {
      req.body.nextPremiumDate = getNextPremiumDate(
        new Date(req.body.startDate),
        req.body.premiumFrequency
      );
    }

    const policy = await Policy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name phone')
      .populate('scheme', 'name type company');

    if (!policy) return error(res, 'Policy not found', 404);
    success(res, policy);
  } catch (err) {
    next(err);
  }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!policy) return error(res, 'Policy not found', 404);
    success(res, { message: 'Policy cancelled' });
  } catch (err) {
    next(err);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    const policy = await Policy.findById(req.params.id);
    if (!policy) return error(res, 'Policy not found', 404);

    policy.documents.push({
      name: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
    });
    await policy.save();
    success(res, policy);
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return error(res, 'Policy not found', 404);

    policy.documents = policy.documents.filter(
      (doc) => doc._id.toString() !== req.params.docId
    );
    await policy.save();
    success(res, policy);
  } catch (err) {
    next(err);
  }
};
