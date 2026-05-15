const Joi = require('joi');

const createAllowedNumber = Joi.object({
  phone: Joi.string().required().trim().min(7).max(20),
  name: Joi.string().required().trim().min(1).max(100),
  role: Joi.string().valid('admin', 'staff').default('staff'),
  isActive: Joi.boolean().default(true),
});

const updateAllowedNumber = Joi.object({
  phone: Joi.string().trim().min(7).max(20),
  name: Joi.string().trim().min(1).max(100),
  role: Joi.string().valid('admin', 'staff'),
  isActive: Joi.boolean(),
});

const testPrompt = Joi.object({
  message: Joi.string().required().trim().min(1).max(1000),
  phone: Joi.string().allow('').trim(),
});

module.exports = { createAllowedNumber, updateAllowedNumber, testPrompt };
