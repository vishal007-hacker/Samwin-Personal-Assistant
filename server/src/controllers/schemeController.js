const Scheme = require('../models/Scheme');
const { success, paginated, error } = require('../utils/responseHelper');

exports.getSchemes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, company, search, activeOnly } = req.query;
    const query = {};

    if (type) query.type = type;
    if (company) query.company = { $regex: company, $options: 'i' };
    if (activeOnly === 'true') query.isActive = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Scheme.find(query).sort({ type: 1, name: 1 }).skip(skip).limit(Number(limit)),
      Scheme.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) return error(res, 'Scheme not found', 404);
    success(res, scheme);
  } catch (err) {
    next(err);
  }
};

exports.createScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.create({ ...req.body, createdBy: req.user._id });
    success(res, scheme, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!scheme) return error(res, 'Scheme not found', 404);
    success(res, scheme);
  } catch (err) {
    next(err);
  }
};

exports.deleteScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!scheme) return error(res, 'Scheme not found', 404);
    success(res, { message: 'Scheme deactivated' });
  } catch (err) {
    next(err);
  }
};

exports.getSchemeTypes = async (req, res, next) => {
  try {
    const types = await Scheme.distinct('type', { isActive: true });
    const companies = await Scheme.distinct('company', { isActive: true });
    success(res, { types, companies });
  } catch (err) {
    next(err);
  }
};
