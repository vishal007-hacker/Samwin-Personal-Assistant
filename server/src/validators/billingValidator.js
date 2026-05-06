const Joi = require('joi');

const itemSchema = Joi.object({
  description: Joi.string().required().trim().min(1).max(300),
  hsn: Joi.string().allow('').trim(),
  quantity: Joi.number().required().min(1),
  unit: Joi.string().allow('').trim().default('Nos'),
  price: Joi.number().required().min(0),
  taxableValue: Joi.number().required().min(0),
});

const createBilling = Joi.object({
  type: Joi.string().required().valid('invoice', 'quotation', 'receipt'),
  date: Joi.date().default(() => new Date()),
  customer: Joi.object({
    name: Joi.string().required().trim().min(1).max(200),
    address: Joi.string().allow('').trim(),
    phone: Joi.string().allow('').trim(),
    gst: Joi.string().allow('').trim().uppercase(),
  }).required(),
  showGst: Joi.boolean().default(false),
  items: Joi.array().items(itemSchema).min(1).required(),
  subtotal: Joi.number().min(0).required(),
  cgstRate: Joi.number().min(0).default(0),
  sgstRate: Joi.number().min(0).default(0),
  cgstAmount: Joi.number().min(0).default(0),
  sgstAmount: Joi.number().min(0).default(0),
  totalAmount: Joi.number().min(0).required(),
  notes: Joi.string().allow('').trim(),
});

const updateBilling = Joi.object({
  date: Joi.date(),
  customer: Joi.object({
    name: Joi.string().trim().min(1).max(200),
    address: Joi.string().allow('').trim(),
    phone: Joi.string().allow('').trim(),
    gst: Joi.string().allow('').trim().uppercase(),
  }),
  showGst: Joi.boolean(),
  items: Joi.array().items(itemSchema).min(1),
  subtotal: Joi.number().min(0),
  cgstRate: Joi.number().min(0),
  sgstRate: Joi.number().min(0),
  cgstAmount: Joi.number().min(0),
  sgstAmount: Joi.number().min(0),
  totalAmount: Joi.number().min(0),
  notes: Joi.string().allow('').trim(),
});

module.exports = { createBilling, updateBilling };
