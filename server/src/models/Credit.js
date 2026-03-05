const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'topup', 'payment'],
    required: true,
  },
  amount: { type: Number, required: true },
  dueDate: { type: Date }, // for credit/topup chunks
  paidAmount: { type: Number, default: 0 }, // for credit/topup chunks — how much has been paid off
  notes: { type: String, trim: true },
  date: { type: Date, default: Date.now },
});

const creditSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true },
    totalAmount: { type: Number, required: true },
    balanceAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true, index: true }, // auto-computed: earliest unpaid chunk's dueDate
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    transactions: [transactionSchema],
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creditSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('Credit', creditSchema);
