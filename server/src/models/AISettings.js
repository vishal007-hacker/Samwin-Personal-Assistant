const mongoose = require('mongoose');

// Singleton document holding AI/WhatsApp settings.
// Key is fixed to "default" — the controller upserts on that key.

const aiSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'default' },

    // ── Daily summary cron ──
    dailySummaryEnabled: { type: Boolean, default: true },
    dailySummaryTime: { type: String, default: '08:30' }, // HH:MM 24h

    // ── Auto-notify customers via WhatsApp on device-service status change ──
    deviceReadyAutoNotify: { type: Boolean, default: false },
    deviceDeliveredAutoNotify: { type: Boolean, default: false },

    // ── AI message composition style ──
    deviceMessageTone: {
      type: String,
      enum: ['friendly', 'formal', 'short'],
      default: 'friendly',
    },

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, _id: false }
);

aiSettingsSchema.statics.get = async function () {
  let doc = await this.findById('default');
  if (!doc) doc = await this.create({ _id: 'default' });
  return doc;
};

module.exports = mongoose.model('AISettings', aiSettingsSchema);
