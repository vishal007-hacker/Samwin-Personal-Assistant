const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ['recharge', 'banking', 'aeps', 'cash'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    balance: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

accountSchema.index({ section: 1, order: 1 });

module.exports = mongoose.model('Account', accountSchema);
