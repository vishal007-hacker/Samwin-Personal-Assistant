const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceProduct',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now, index: true },
    workDone: { type: String, trim: true },
    cost: { type: Number, default: 0, min: 0 },
    servicePersonName: { type: String, trim: true },
    servicePersonContact: { type: String, trim: true },
    nextDueDate: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

maintenanceRecordSchema.index({ date: -1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
