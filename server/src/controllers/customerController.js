const Customer = require('../models/Customer');
const { success, paginated, error } = require('../utils/responseHelper');

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      Customer.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Customer.countDocuments(query),
    ]);

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return error(res, 'Customer not found', 404);
    success(res, customer);
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
    success(res, customer, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return error(res, 'Customer not found', 404);
    success(res, customer);
  } catch (err) {
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return error(res, 'Customer not found', 404);
    success(res, { message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
};

exports.searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return success(res, []);

    const customers = await Customer.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name phone email')
      .limit(20);

    success(res, customers);
  } catch (err) {
    next(err);
  }
};
