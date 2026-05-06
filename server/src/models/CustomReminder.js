const mongoose = require('mongoose');

const customReminderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    intervalMinutes: {
      type: Number,
      required: true,
      enum: [5, 10, 15, 30, 60, 180, 360, 600],
    },
    endDate: { type: Date, required: true },
    nextTrigger: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastTriggered: { type: Date },
    triggerCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

customReminderSchema.index({ isActive: 1, nextTrigger: 1 });

module.exports = mongoose.model('CustomReminder', customReminderSchema);
