const mongoose = require('mongoose');

const accountSnapshotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true, index: true },
    recharge: { type: Number, default: 0 },
    banking: { type: Number, default: 0 },
    aeps: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    // Per-account breakdown captured at snapshot time
    details: [
      {
        section: String,
        name: String,
        balance: Number,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AccountSnapshot', accountSnapshotSchema);
