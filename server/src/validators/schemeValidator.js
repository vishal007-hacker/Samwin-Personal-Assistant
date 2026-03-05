const Joi = require('joi');

const createScheme = Joi.object({
  name: Joi.string().required().trim().min(2).max(200),
  type: Joi.string().required().valid('Life', 'Health', 'Vehicle', 'Property', 'Travel', 'Other'),
  company: Joi.string().required().trim().min(2).max(100),
  description: Joi.string().allow('').trim(),
  premiumFrequencies: Joi.array().items(
    Joi.string().valid('monthly', 'quarterly', 'half-yearly', 'yearly')
  ),
  minCoverageAmount: Joi.number().min(0).allow(null),
  maxCoverageAmount: Joi.number().min(0).allow(null),
  minMaturityPeriodYears: Joi.number().min(0).allow(null),
  maxMaturityPeriodYears: Joi.number().min(0).allow(null),
  minEntryAge: Joi.number().min(0).allow(null),
  maxEntryAge: Joi.number().min(0).allow(null),
  features: Joi.array().items(Joi.string().trim()),
  isActive: Joi.boolean(),
});

const updateScheme = createScheme;

module.exports = { createScheme, updateScheme };
