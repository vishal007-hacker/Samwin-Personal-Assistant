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
