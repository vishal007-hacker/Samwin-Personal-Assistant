const Joi = require('joi');

const createAttendance = Joi.object({
  employee: Joi.string().required().min(1),
  date: Joi.date().required(),
  morningIn: Joi.string().allow('').trim(),
  afternoonOut: Joi.string().allow('').trim(),
  afterLunchIn: Joi.string().allow('').trim(),
  nightOut: Joi.string().allow('').trim(),
  workDetails: Joi.string().allow('').trim(),
  location: Joi.string().allow('').trim(),
  expenses: Joi.number().min(0).default(0),
  expenseNotes: Joi.string().allow('').trim(),
  permissionHours: Joi.number().min(0).default(0),
  permissionReason: Joi.string().allow('').trim(),
  status: Joi.string().valid('present', 'absent', 'half-day', 'leave').default('present'),
  notes: Joi.string().allow('').trim(),
});

const updateAttendance = Joi.object({
  morningIn: Joi.string().allow('').trim(),
  afternoonOut: Joi.string().allow('').trim(),
  afterLunchIn: Joi.string().allow('').trim(),
  nightOut: Joi.string().allow('').trim(),
  workDetails: Joi.string().allow('').trim(),
  location: Joi.string().allow('').trim(),
  expenses: Joi.number().min(0),
  expenseNotes: Joi.string().allow('').trim(),
  permissionHours: Joi.number().min(0),
  permissionReason: Joi.string().allow('').trim(),
  status: Joi.string().valid('present', 'absent', 'half-day', 'leave'),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createAttendance, updateAttendance };
