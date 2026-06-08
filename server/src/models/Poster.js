const mongoose = require('mongoose');

const posterSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },          // e.g. "John 3:16"
    bodyText: { type: String, required: true },   // the main verse text
    footer: { type: String, trim: true },         // e.g. "— Samwin Infotech"
    theme: { type: String, trim: true, default: 'sunset' },
    // Free-form so we can grow the designer without DB migrations.
    style: { type: mongoose.Schema.Types.Mixed, default: {} },
    isFavorite: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poster', posterSchema);
