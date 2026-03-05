const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['Life', 'Health', 'Vehicle', 'Property', 'Travel', 'Other'],
    },
    company: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    premiumFrequencies: [
      {
        type: String,
        enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
      },
    ],
    minCoverageAmount: { type: Number },
    maxCoverageAmount: { type: Number },
    minMaturityPeriodYears: { type: Number },
    maxMaturityPeriodYears: { type: Number },
    minEntryAge: { type: Number },
    maxEntryAge: { type: Number },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

schemeSchema.index({ type: 1 });
schemeSchema.index({ company: 1 });
schemeSchema.index({ name: 'text', company: 'text' });

module.exports = mongoose.model('Scheme', schemeSchema);
