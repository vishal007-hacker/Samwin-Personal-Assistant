const Joi = require('joi');

const createPolicy = Joi.object({
  policyNumber: Joi.string().required().trim(),
  customer: Joi.string().required().hex().length(24),
  scheme: Joi.string().required().hex().length(24),
  startDate: Joi.date().required(),
  maturityDate: Joi.date().required().greater(Joi.ref('startDate')),
  premiumAmount: Joi.number().required().min(1),
  premiumFrequency: Joi.string().required().valid('monthly', 'quarterly', 'half-yearly', 'yearly'),
  sumAssured: Joi.number().required().min(1),
  nominee: Joi.object({
    name: Joi.string().trim(),
    relationship: Joi.string().trim(),
    phone: Joi.string().trim(),
  }),
  notes: Joi.string().allow('').trim(),
});

const updatePolicy = Joi.object({
  policyNumber: Joi.string().trim(),
  startDate: Joi.date(),
  maturityDate: Joi.date(),
  premiumAmount: Joi.number().min(1),
  premiumFrequency: Joi.string().valid('monthly', 'quarterly', 'half-yearly', 'yearly'),
  sumAssured: Joi.number().min(1),
  nominee: Joi.object({
    name: Joi.string().trim(),
    relationship: Joi.string().trim(),
    phone: Joi.string().trim(),
  }),
  status: Joi.string().valid('active', 'matured', 'lapsed', 'surrendered', 'cancelled'),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createPolicy, updatePolicy };
