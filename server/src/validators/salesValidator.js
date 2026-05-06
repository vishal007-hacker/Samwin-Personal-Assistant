const Joi = require('joi');

const createCategory = Joi.object({
  name: Joi.string().required().trim().min(2).max(200),
});

const updateCategory = Joi.object({
  name: Joi.string().trim().min(2).max(200),
});

const createSale = Joi.object({
  category: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
  unitPrice: Joi.number().required().min(0),
  amount: Joi.number().required().min(0),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').default('cash'),
  date: Joi.date().default(() => new Date()),
  customerName: Joi.string().allow('').trim(),
  notes: Joi.string().allow('').trim(),
});

const updateSale = Joi.object({
  category: Joi.string(),
  quantity: Joi.number().integer().min(1),
  unitPrice: Joi.number().min(0),
  amount: Joi.number().min(0),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other'),
  date: Joi.date(),
  customerName: Joi.string().allow('').trim(),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createCategory, updateCategory, createSale, updateSale };
