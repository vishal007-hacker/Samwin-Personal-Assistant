const Joi = require('joi');

const createPayment = Joi.object({
  policy: Joi.string().required().hex().length(24),
  customer: Joi.string().required().hex().length(24),
  amount: Joi.number().required().min(1),
  paymentDate: Joi.date().required(),
  premiumDueDate: Joi.date().allow(null),
  paymentMethod: Joi.string().valid('cash', 'cheque', 'upi', 'bank_transfer', 'online').default('cash'),
  referenceNumber: Joi.string().allow('').trim(),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createPayment };
