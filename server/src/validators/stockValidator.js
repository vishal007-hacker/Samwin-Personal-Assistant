const Joi = require('joi');

const createStock = Joi.object({
  category: Joi.string().valid('mobile', 'phone_accessory', 'computer_accessory').default('mobile'),
  brand: Joi.string().required(),
  model: Joi.string().required(),
  ram: Joi.string().allow(''),
  storage: Joi.string().allow(''),
  displaySize: Joi.string().allow(''),
  displayQuality: Joi.string().allow(''),
  network: Joi.string().allow(''),
  color: Joi.string().allow(''),
  purchasePrice: Joi.number().min(0).required(),
  sellingPrice: Joi.number().min(0).required(),
  purchasedFrom: Joi.string().allow(''),
});

const updateStock = Joi.object({
  uniqueCode: Joi.number().integer().min(1),
  category: Joi.string().valid('mobile', 'phone_accessory', 'computer_accessory'),
  brand: Joi.string(),
  model: Joi.string(),
  ram: Joi.string().allow(''),
  storage: Joi.string().allow(''),
  displaySize: Joi.string().allow(''),
  displayQuality: Joi.string().allow(''),
  network: Joi.string().allow(''),
  color: Joi.string().allow(''),
  purchasePrice: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
  purchasedFrom: Joi.string().allow(''),
});

const sellStock = Joi.object({
  customerName: Joi.string().required(),
  contactNumber: Joi.string().required(),
  finalPrice: Joi.number().min(0).required(),
  complements: Joi.string().allow(''),
});

module.exports = { createStock, updateStock, sellStock };
