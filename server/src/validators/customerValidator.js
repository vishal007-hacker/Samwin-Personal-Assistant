const Joi = require('joi');

const createCustomer = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  phone: Joi.string().required().trim().min(10).max(15),
  email: Joi.string().email().allow('').trim(),
  address: Joi.object({
    street: Joi.string().allow('').trim(),
    city: Joi.string().allow('').trim(),
    state: Joi.string().allow('').trim(),
    pincode: Joi.string().allow('').trim().max(10),
  }),
  aadhaarNumber: Joi.string().allow('').trim().max(14),
  panNumber: Joi.string().allow('').trim().max(10).uppercase(),
  dateOfBirth: Joi.date().allow(null),
  nominees: Joi.array().items(
    Joi.object({
      name: Joi.string().trim(),
      relationship: Joi.string().valid('Spouse', 'Child', 'Parent', 'Sibling', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'),
      phone: Joi.string().allow('').trim(),
      aadhaarNumber: Joi.string().allow('').trim(),
    })
  ),
  notes: Joi.string().allow('').trim(),
});

const updateCustomer = createCustomer;

module.exports = { createCustomer, updateCustomer };
