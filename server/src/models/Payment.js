const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    premiumDueDate: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'upi', 'bank_transfer', 'online'],
      default: 'cash',
    },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentDate: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
