const mongoose = require('mongoose');

// Phones whitelisted to chat with the AI bot.
// Stored as digits only (no +, no spaces); helper normalizes phone for comparison.
const allowedNumberSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Normalize to digits-only on save
allowedNumberSchema.pre('save', function (next) {
  if (this.phone) this.phone = String(this.phone).replace(/\D/g, '');
  next();
});

// Static: find an active entry by any phone format
allowedNumberSchema.statics.findActiveByPhone = function (phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  // Match either 10-digit or with country code
  const last10 = digits.slice(-10);
  return this.findOne({
    isActive: true,
    $or: [{ phone: digits }, { phone: last10 }, { phone: '91' + last10 }],
  });
};

module.exports = mongoose.model('AllowedNumber', allowedNumberSchema);
