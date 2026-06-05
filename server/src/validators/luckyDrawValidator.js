const Joi = require('joi');

const createParticipant = Joi.object({
  name: Joi.string().required().trim().min(1).max(100),
  phone: Joi.string().required().trim().min(7).max(20),
  purchaseDetails: Joi.string().allow('').trim(),
  notes: Joi.string().allow('').trim(),
});

const updateParticipant = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim().min(7).max(20),
  purchaseDetails: Joi.string().allow('').trim(),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createParticipant, updateParticipant };
