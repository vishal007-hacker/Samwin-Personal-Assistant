const Joi = require('joi');

const createProduct = Joi.object({
  name: Joi.string().required().trim().min(1).max(100),
  category: Joi.string().allow('').trim(),
  serialNumber: Joi.string().allow('').trim(),
  location: Joi.string().allow('').trim(),
  frequencyDays: Joi.number().integer().min(1).default(30),
  nextMaintenanceDate: Joi.date().allow(null, ''),
  isActive: Joi.boolean().default(true),
  notes: Joi.string().allow('').trim(),
});

const updateProduct = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  category: Joi.string().allow('').trim(),
  serialNumber: Joi.string().allow('').trim(),
  location: Joi.string().allow('').trim(),
  frequencyDays: Joi.number().integer().min(1),
  nextMaintenanceDate: Joi.date().allow(null, ''),
  isActive: Joi.boolean(),
  notes: Joi.string().allow('').trim(),
});

const createRecord = Joi.object({
  product: Joi.string().required().min(1),
  date: Joi.date().default(() => new Date()),
  workDone: Joi.string().allow('').trim(),
  cost: Joi.number().min(0).default(0),
  servicePersonName: Joi.string().allow('').trim(),
  servicePersonContact: Joi.string().allow('').trim(),
  nextDueDate: Joi.date().allow(null, ''),
  notes: Joi.string().allow('').trim(),
});

const updateRecord = Joi.object({
  date: Joi.date(),
  workDone: Joi.string().allow('').trim(),
  cost: Joi.number().min(0),
  servicePersonName: Joi.string().allow('').trim(),
  servicePersonContact: Joi.string().allow('').trim(),
  nextDueDate: Joi.date().allow(null, ''),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createProduct, updateProduct, createRecord, updateRecord };
