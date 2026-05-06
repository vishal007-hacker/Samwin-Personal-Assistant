const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// Reuse existing Counter model if already registered, otherwise create
const BillingCounter =
  mongoose.models.BillingCounter || mongoose.model('BillingCounter', counterSchema);

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  hsn: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, trim: true, default: 'Nos' },
  price: { type: Number, required: true, min: 0 },
  taxableValue: { type: Number, required: true, min: 0 },
});

const billingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['invoice', 'quotation', 'receipt'],
      required: true,
      index: true,
    },
    number: { type: String, unique: true, index: true },
    sequenceNumber: { type: Number },
    date: { type: Date, required: true, default: Date.now },

    // Customer details
    customer: {
      name: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      gst: { type: String, trim: true, uppercase: true },
    },

    // Show our GST only on invoices
    showGst: { type: Boolean, default: false },

    // Line items
    items: [itemSchema],

    // Totals
    subtotal: { type: Number, required: true, default: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },

    notes: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate sequential number before save
billingSchema.pre('save', async function (next) {
  if (this.isNew) {
    const prefix = this.type === 'invoice' ? 'INV' : this.type === 'quotation' ? 'QTN' : 'RCT';
    const counterKey = `billing_${this.type}`;

    const counter = await BillingCounter.findByIdAndUpdate(
      counterKey,
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );

    this.sequenceNumber = counter.seq;
    // Format: INV-0001, QTN-0001, RCT-0001
    this.number = `${prefix}-${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});

billingSchema.index({ type: 1, date: -1 });
billingSchema.index({ 'customer.name': 'text', 'customer.phone': 'text', number: 'text' });

module.exports = mongoose.model('Billing', billingSchema);
