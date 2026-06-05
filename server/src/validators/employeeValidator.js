const Joi = require('joi');

const createEmployee = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  phone: Joi.string().required().trim().min(10).max(15),
  email: Joi.string().email().allow('').trim(),
  designation: Joi.string().allow('').trim(),
  address: Joi.string().allow('').trim(),
  aadhaarNumber: Joi.string().allow('').trim(),
  dateOfJoining: Joi.date().allow(null),
  salary: Joi.number().min(0).default(0),
  defaultInTime: Joi.string().allow('').trim().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).message('In time must be HH:MM (24h)'),
  defaultOutTime: Joi.string().allow('').trim().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).message('Out time must be HH:MM (24h)'),
  bankAccount: Joi.object({
    accountNumber: Joi.string().allow('').trim(),
    ifsc: Joi.string().allow('').trim(),
    bankName: Joi.string().allow('').trim(),
  }),
  notes: Joi.string().allow('').trim(),
});

const updateEmployee = createEmployee;

module.exports = { createEmployee, updateEmployee };
