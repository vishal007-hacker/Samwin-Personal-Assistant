const Joi = require('joi');

const createCredit = Joi.object({
  customer: Joi.string().required().hex().length(24),
  reason: Joi.string().required().trim().min(2).max(200),
  totalAmount: Joi.number().required().min(1),
  dueDate: Joi.date().required(),
  notes: Joi.string().allow('').trim(),
});

const topupCredit = Joi.object({
  amount: Joi.number().required().min(1),
  dueDate: Joi.date().required(),
  notes: Joi.string().allow('').trim(),
});

const paymentCredit = Joi.object({
  amount: Joi.number().required().min(1),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createCredit, topupCredit, paymentCredit };
