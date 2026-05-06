const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

const stockSchema = new mongoose.Schema(
  {
    uniqueCode: { type: Number, unique: true, index: true },
    category: {
      type: String,
      enum: ['mobile', 'phone_accessory', 'computer_accessory'],
      default: 'mobile',
      index: true,
    },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    ram: { type: String, trim: true },
    storage: { type: String, trim: true },
    displaySize: { type: String, trim: true },
    displayQuality: { type: String, trim: true },
    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    network: { type: String, trim: true },
    color: { type: String, trim: true },
    purchasedFrom: { type: String, trim: true },
    status: {
      type: String,
      enum: ['in_stock', 'sold'],
      default: 'in_stock',
      index: true,
    },
    // Filled when sold
    soldTo: {
      customerName: { type: String, trim: true },
      contactNumber: { type: String, trim: true },
      finalPrice: { type: Number },
      complements: { type: String, trim: true },
    },
    soldAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockSchema.pre('save', async function (next) {
  if (this.isNew && !this.uniqueCode) {
    const counter = await Counter.findByIdAndUpdate(
      'stockCode',
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.uniqueCode = counter.seq;
  }
  next();
});

stockSchema.index({ brand: 'text', model: 'text' });

module.exports = mongoose.model('Stock', stockSchema);
