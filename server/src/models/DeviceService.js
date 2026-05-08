const mongoose = require('mongoose');

const deviceServiceSchema = new mongoose.Schema(
  {
    serialNo: { type: String, trim: true, index: true },
    deviceType: { type: String, required: true, trim: true, index: true },
    lockType: {
      type: String,
      enum: ['none', 'pin', 'password', 'pattern', 'fingerprint', 'face', 'other'],
      default: 'none',
    },
    lockValue: { type: String, trim: true },
    problem: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'ready', 'returned'],
      default: 'pending',
      index: true,
    },
    amount: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

deviceServiceSchema.index({ customerName: 'text', customerPhone: 'text', serialNo: 'text', problem: 'text' });

module.exports = mongoose.model('DeviceService', deviceServiceSchema);
