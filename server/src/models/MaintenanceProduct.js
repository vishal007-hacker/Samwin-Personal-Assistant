const mongoose = require('mongoose');

const maintenanceProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    location: { type: String, trim: true },
    frequencyDays: { type: Number, default: 30, min: 1 },
    nextMaintenanceDate: { type: Date, index: true },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

maintenanceProductSchema.index({ name: 'text', category: 'text' });

module.exports = mongoose.model('MaintenanceProduct', maintenanceProductSchema);
