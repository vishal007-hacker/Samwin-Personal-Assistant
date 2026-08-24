const crypto = require('crypto');
const prisma = require('../config/prisma');
const { getNextPremiumDate } = require('../utils/dateHelpers');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const manageInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  scheme: { select: { id: true, name: true, type: true, company: true } },
};

exports.getPolicies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, customer, scheme, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const where = {};

    if (customer) where.customerId = customer;
    if (scheme) where.schemeId = scheme;
    if (status) where.status = status;
    if (search) where.policyNumber = { contains: search, mode: 'insensitive' };

    const skip = (Number(page) - 1) * Number(limit);
    const orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [docs, total] = await Promise.all([
      prisma.policy.findMany({ where, include: manageInclude, orderBy, skip, take: Number(limit) }),
      prisma.policy.count({ where }),
    ]);

    paginated(res, { docs: many(docs), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getPolicy = async (req, res, next) => {
  try {
    const policy = await prisma.policy.findUnique({
      where: { id: req.params.id },
      include: { customer: true, scheme: true },
    });
    if (!policy) return error(res, 'Policy not found', 404);
    success(res, one(policy));
  } catch (err) {
    next(err);
  }
};

exports.createPolicy = async (req, res, next) => {
  try {
    const { startDate, premiumFrequency } = req.body;
    const nextPremiumDate = getNextPremiumDate(new Date(startDate), premiumFrequency);

    const { customer, scheme, ...rest } = req.body;
    const policy = await prisma.policy.create({
      data: {
        ...rest,
        customerId: customer,
        schemeId: scheme,
        nextPremiumDate,
        createdById: req.user.id,
      },
    });

    const populated = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        scheme: { select: { id: true, name: true, type: true, company: true } },
      },
    });

    success(res, one(populated), 201);
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

    const data = { ...req.body };
    if (data.customer) {
      data.customerId = data.customer;
      delete data.customer;
    }
    if (data.scheme) {
      data.schemeId = data.scheme;
      delete data.scheme;
    }

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data,
      include: manageInclude,
    });

    if (!policy) return error(res, 'Policy not found', 404);
    success(res, one(policy));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Policy not found', 404);
    next(err);
  }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });
    if (!policy) return error(res, 'Policy not found', 404);
    success(res, { message: 'Policy cancelled' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Policy not found', 404);
    next(err);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) return error(res, 'Policy not found', 404);

    const documents = Array.isArray(policy.documents) ? policy.documents : [];
    documents.push({
      _id: crypto.randomUUID(),
      name: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date(),
    });

    await prisma.policy.update({ where: { id: policy.id }, data: { documents } });

    const updated = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: { customer: true, scheme: true },
    });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
    if (!policy) return error(res, 'Policy not found', 404);

    const documents = Array.isArray(policy.documents) ? policy.documents : [];
    const filtered = documents.filter((doc) => String(doc._id) !== req.params.docId);
    await prisma.policy.update({ where: { id: policy.id }, data: { documents: filtered } });

    const updated = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: { customer: true, scheme: true },
    });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};