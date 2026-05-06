const mongoose = require('mongoose');

const vehicleInsuranceSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    insuranceType: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, trim: true, uppercase: true },
    vehicleBrand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    yearOfManufacturing: { type: Number, required: true },
    registrationDate: { type: Date },
    engineNumber: { type: String, trim: true },
    chasisNumber: { type: String, trim: true },
    policyCompany: { type: String, trim: true },
    policyNumber: { type: String, required: true, trim: true },
    policyExpiryDate: { type: Date, required: true },
    reminderStartDate: { type: Date },
    rcBookFile: { type: String },
    oldInsuranceFile: { type: String },
    status: {
      type: String,
      enum: ['active', 'expired', 'renewed'],
      default: 'active',
    },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-set reminder start date to 10 days before expiry
vehicleInsuranceSchema.pre('save', function (next) {
  if (this.isModified('policyExpiryDate') || this.isNew) {
    const expiry = new Date(this.policyExpiryDate);
    expiry.setDate(expiry.getDate() - 10);
    this.reminderStartDate = expiry;
  }
  next();
});

vehicleInsuranceSchema.index({ customer: 1 });
vehicleInsuranceSchema.index({ policyExpiryDate: 1 });
vehicleInsuranceSchema.index({ status: 1 });

module.exports = mongoose.model('VehicleInsurance', vehicleInsuranceSchema);
