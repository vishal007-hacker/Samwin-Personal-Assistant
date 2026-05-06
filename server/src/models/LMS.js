const mongoose = require('mongoose');

const lmsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    userId: { type: String, trim: true },
    password: { type: String, trim: true },
    message: { type: String, trim: true },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

lmsSchema.index({ title: 'text', message: 'text' });

module.exports = mongoose.model('LMS', lmsSchema);
