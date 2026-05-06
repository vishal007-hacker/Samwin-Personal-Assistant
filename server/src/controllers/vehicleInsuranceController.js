const VehicleInsurance = require('../models/VehicleInsurance');
const InsuranceType = require('../models/InsuranceType');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/vehicle-insurance
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, filter } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};

    if (status) query.status = status;

    const now = new Date();
    if (filter === 'expiring_soon') {
      const tenDays = new Date();
      tenDays.setDate(tenDays.getDate() + 10);
      query.policyExpiryDate = { $gte: now, $lte: tenDays };
      query.status = 'active';
    } else if (filter === 'expired') {
      query.policyExpiryDate = { $lt: now };
      query.status = 'active';
    }

    let docs, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const all = await VehicleInsurance.find(query)
        .populate('customer', 'name phone aadhaarNumber panNumber')
        .sort({ policyExpiryDate: 1 });

      const filtered = all.filter(
        (d) =>
          searchRegex.test(d.customer?.name) ||
          searchRegex.test(d.customer?.phone) ||
          searchRegex.test(d.policyNumber) ||
          searchRegex.test(d.vehicleBrand) ||
          searchRegex.test(d.model)
      );
      total = filtered.length;
      docs = filtered.slice(skip, skip + Number(limit));
    } else {
      [docs, total] = await Promise.all([
        VehicleInsurance.find(query)
          .populate('customer', 'name phone aadhaarNumber panNumber')
          .sort({ policyExpiryDate: 1 })
          .skip(skip)
          .limit(Number(limit)),
        VehicleInsurance.countDocuments(query),
      ]);
    }

    paginated(res, { docs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/vehicle-insurance/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await VehicleInsurance.findById(req.params.id)
      .populate('customer', 'name phone email aadhaarNumber panNumber address');
    if (!doc) return error(res, 'Vehicle insurance not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/vehicle-insurance
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    if (req.files?.rcBook?.[0]) data.rcBookFile = req.files.rcBook[0].filename;
    if (req.files?.oldInsurance?.[0]) data.oldInsuranceFile = req.files.oldInsurance[0].filename;

    const doc = await VehicleInsurance.create(data);
    await doc.populate('customer', 'name phone aadhaarNumber panNumber');
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/vehicle-insurance/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await VehicleInsurance.findById(req.params.id);
    if (!doc) return error(res, 'Vehicle insurance not found', 404);

    Object.assign(doc, req.body);
    if (req.files?.rcBook?.[0]) doc.rcBookFile = req.files.rcBook[0].filename;
    if (req.files?.oldInsurance?.[0]) doc.oldInsuranceFile = req.files.oldInsurance[0].filename;

    await doc.save();
    await doc.populate('customer', 'name phone aadhaarNumber panNumber');
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/vehicle-insurance/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await VehicleInsurance.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Vehicle insurance not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/vehicle-insurance/due-reminders
exports.getDueReminders = async (req, res, next) => {
  try {
    const now = new Date();
    const docs = await VehicleInsurance.find({
      status: 'active',
      reminderStartDate: { $lte: now },
      policyExpiryDate: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('customer', 'name phone email')
      .sort({ policyExpiryDate: 1 });

    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// --- Insurance Types ---

// GET /api/vehicle-insurance/types
exports.getTypes = async (req, res, next) => {
  try {
    const types = await InsuranceType.find().sort({ name: 1 });
    success(res, types);
  } catch (err) {
    next(err);
  }
};

// POST /api/vehicle-insurance/types
exports.createType = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return error(res, 'Type name is required', 400);
    const existing = await InsuranceType.findOne({ name: name.trim() });
    if (existing) return error(res, 'Type already exists', 400);
    const type = await InsuranceType.create({ name: name.trim(), createdBy: req.user._id });
    success(res, type, 201);
  } catch (err) {
    next(err);
  }
};
