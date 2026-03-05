const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
  {
    policyNumber: { type: String, required: true, unique: true, trim: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    maturityDate: { type: Date, required: true },
    premiumAmount: { type: Number, required: true },
    premiumFrequency: {
      type: String,
      required: true,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    },
    sumAssured: { type: Number, required: true },
    nominee: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    nextPremiumDate: { type: Date, index: true },
    status: {
      type: String,
      enum: ['active', 'matured', 'lapsed', 'surrendered', 'cancelled'],
      default: 'active',
      index: true,
    },
    reminderSettings: {
      oneMonthBefore: { type: Boolean, default: true },
      tenDaysBefore: { type: Boolean, default: true },
      fiveDaysBefore: { type: Boolean, default: true },
      oneDayBefore: { type: Boolean, default: true },
    },
    documents: [
      {
        name: { type: String },
        originalName: { type: String },
        path: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

policySchema.index({ nextPremiumDate: 1, status: 1 });

module.exports = mongoose.model('Policy', policySchema);
