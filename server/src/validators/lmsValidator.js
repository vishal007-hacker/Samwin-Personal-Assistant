const Joi = require('joi');

const createLMS = Joi.object({
  title: Joi.string().required().trim().min(1).max(300),
  link: Joi.string().allow('').trim(),
  userId: Joi.string().allow('').trim(),
  password: Joi.string().allow('').trim(),
  message: Joi.string().allow('').trim(),
  order: Joi.number().default(0),
});

const updateLMS = Joi.object({
  title: Joi.string().trim().min(1).max(300),
  link: Joi.string().allow('').trim(),
  userId: Joi.string().allow('').trim(),
  password: Joi.string().allow('').trim(),
  message: Joi.string().allow('').trim(),
  order: Joi.number(),
});

module.exports = { createLMS, updateLMS };
