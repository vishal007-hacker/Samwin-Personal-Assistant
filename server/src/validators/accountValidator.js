const Joi = require('joi');

const SECTIONS = ['recharge', 'banking', 'aeps', 'cash'];

const createAccount = Joi.object({
  section: Joi.string().valid(...SECTIONS).required(),
  name: Joi.string().required().trim().min(1).max(80),
  balance: Joi.number().default(0),
  order: Joi.number().default(0),
});

const updateAccount = Joi.object({
  section: Joi.string().valid(...SECTIONS),
  name: Joi.string().trim().min(1).max(80),
  balance: Joi.number(),
  order: Joi.number(),
});

module.exports = { createAccount, updateAccount };
