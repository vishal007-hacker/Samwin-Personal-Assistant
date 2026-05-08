const Joi = require('joi');

const LOCK_TYPES = ['none', 'pin', 'password', 'pattern', 'fingerprint', 'face', 'other'];

const createDeviceService = Joi.object({
  serialNo: Joi.string().allow('').trim(),
  deviceType: Joi.string().required().trim().min(1).max(50),
  lockType: Joi.string().valid(...LOCK_TYPES).default('none'),
  lockValue: Joi.string().allow('').trim(),
  problem: Joi.string().allow('').trim(),
  date: Joi.date().default(() => new Date()),
  customerName: Joi.string().required().trim().min(1).max(100),
  customerPhone: Joi.string().allow('').trim(),
  status: Joi.string().valid('pending', 'ready', 'returned').default('pending'),
  amount: Joi.number().min(0).default(0),
  notes: Joi.string().allow('').trim(),
});

const updateDeviceService = Joi.object({
  serialNo: Joi.string().allow('').trim(),
  deviceType: Joi.string().trim().min(1).max(50),
  lockType: Joi.string().valid(...LOCK_TYPES),
  lockValue: Joi.string().allow('').trim(),
  problem: Joi.string().allow('').trim(),
  date: Joi.date(),
  customerName: Joi.string().trim().min(1).max(100),
  customerPhone: Joi.string().allow('').trim(),
  status: Joi.string().valid('pending', 'ready', 'returned'),
  amount: Joi.number().min(0),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createDeviceService, updateDeviceService };
