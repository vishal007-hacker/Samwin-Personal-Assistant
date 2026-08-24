const Joi = require('joi');

const createService = Joi.object({
  date: Joi.date().default(() => new Date()),
  customer: Joi.string().required().min(1),
  typeOfWork: Joi.string().required().trim().min(1).max(100),
  materialsUsed: Joi.string().allow('').trim(),
  askingPrice: Joi.number().min(0).default(0),
  receivedCash: Joi.number().min(0).default(0),
  notes: Joi.string().allow('').trim(),
});

const updateService = Joi.object({
  date: Joi.date(),
  customer: Joi.string().min(1),
  typeOfWork: Joi.string().trim().min(1).max(100),
  materialsUsed: Joi.string().allow('').trim(),
  askingPrice: Joi.number().min(0),
  receivedCash: Joi.number().min(0),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createService, updateService };
