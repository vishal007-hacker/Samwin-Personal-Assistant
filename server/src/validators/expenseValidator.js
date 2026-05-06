const Joi = require('joi');

const createExpense = Joi.object({
  title: Joi.string().required().trim().min(2).max(200),
  amount: Joi.number().required().min(0),
  category: Joi.string().required().trim(),
  date: Joi.date().default(() => new Date()),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').default('cash'),
  notes: Joi.string().allow('').trim(),
});

const updateExpense = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  amount: Joi.number().min(0),
  category: Joi.string().trim(),
  date: Joi.date(),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other'),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createExpense, updateExpense };
