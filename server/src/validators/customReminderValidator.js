const Joi = require('joi');

const createReminder = Joi.object({
  title: Joi.string().required().trim().min(1).max(500),
  intervalMinutes: Joi.number().required().valid(5, 10, 15, 30, 60, 180, 360, 600),
  endDate: Joi.date().required().greater('now'),
});

const updateReminder = Joi.object({
  title: Joi.string().trim().min(1).max(500),
  intervalMinutes: Joi.number().valid(5, 10, 15, 30, 60, 180, 360, 600),
  endDate: Joi.date(),
  isActive: Joi.boolean(),
});

module.exports = { createReminder, updateReminder };
