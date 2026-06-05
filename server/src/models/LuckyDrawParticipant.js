const mongoose = require('mongoose');

// Reuse the existing Counter collection for auto-incrementing the serial number.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const luckyDrawParticipantSchema = new mongoose.Schema(
  {
    serialNo: { type: Number, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    purchaseDetails: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Mark the winner so it persists across reloads (and we can show a history)
    isWinner: { type: Boolean, default: false, index: true },
    drawnAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

luckyDrawParticipantSchema.pre('save', async function (next) {
  if (this.isNew && !this.serialNo) {
    const c = await Counter.findByIdAndUpdate(
      'luckyDrawSerial',
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.serialNo = c.seq;
  }
  next();
});

luckyDrawParticipantSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('LuckyDrawParticipant', luckyDrawParticipantSchema);
