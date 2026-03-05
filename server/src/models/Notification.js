const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['premium_reminder', 'overdue_alert', 'maturity_alert'],
      required: true,
    },
    policy: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    message: { type: String, required: true },
    channels: {
      whatsapp: { sent: { type: Boolean, default: false }, sentAt: Date },
      push: { sent: { type: Boolean, default: false }, sentAt: Date },
    },
    isRead: { type: Boolean, default: false, index: true },
    scheduledFor: { type: Date, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
