const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    dateOfBirth: { type: Date },
    nominees: [
      {
        name: { type: String, trim: true },
        relationship: {
          type: String,
          enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'],
        },
        phone: { type: String, trim: true },
        aadhaarNumber: { type: String, trim: true },
      },
    ],
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', phone: 'text', email: 'text' });
customerSchema.index({ panNumber: 1 });

module.exports = mongoose.model('Customer', customerSchema);
