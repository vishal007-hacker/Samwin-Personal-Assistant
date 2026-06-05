const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    designation: { type: String, trim: true },
    address: { type: String, trim: true },
    aadhaarNumber: { type: String, trim: true },
    dateOfJoining: { type: Date },
    salary: { type: Number, default: 0 },
    // Default work schedule — used to compute late arrival / early exit
    defaultInTime: { type: String, trim: true, default: '09:00' },   // HH:MM 24h
    defaultOutTime: { type: String, trim: true, default: '18:00' },  // HH:MM 24h
    bankAccount: {
      accountNumber: { type: String, trim: true },
      ifsc: { type: String, trim: true },
      bankName: { type: String, trim: true },
    },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

employeeSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
