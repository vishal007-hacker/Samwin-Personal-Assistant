const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now, index: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    typeOfWork: {
      type: String,
      enum: ['new_installation', 'addon_works', 'service'],
      required: true,
      index: true,
    },
    materialsUsed: { type: String, trim: true },
    askingPrice: { type: Number, default: 0, min: 0 },
    receivedCash: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

serviceSchema.index({ date: -1 });

module.exports = mongoose.model('Service', serviceSchema);
