const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },

    // Time entries
    morningIn: { type: String, trim: true },    // e.g. "09:00"
    afternoonOut: { type: String, trim: true },  // e.g. "13:00"
    afterLunchIn: { type: String, trim: true },  // e.g. "14:00"
    nightOut: { type: String, trim: true },      // e.g. "18:00"

    // Work details
    workDetails: { type: String, trim: true },
    location: { type: String, trim: true },

    // Daily expenses
    expenses: { type: Number, default: 0 },
    expenseNotes: { type: String, trim: true },

    // Status
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'leave'],
      default: 'present',
      index: true,
    },

    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One attendance per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
