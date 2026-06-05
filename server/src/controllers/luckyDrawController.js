const LuckyDrawParticipant = require('../models/LuckyDrawParticipant');
const { success, error } = require('../utils/responseHelper');

// GET /api/lucky-draw
exports.getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { purchaseDetails: { $regex: search, $options: 'i' } },
      ];
    }
    const docs = await LuckyDrawParticipant.find(query).sort({ serialNo: 1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// POST /api/lucky-draw
exports.create = async (req, res, next) => {
  try {
    const doc = await LuckyDrawParticipant.create({ ...req.body, createdBy: req.user._id });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/lucky-draw/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await LuckyDrawParticipant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return error(res, 'Participant not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lucky-draw/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await LuckyDrawParticipant.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Participant not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/lucky-draw/draw — pick a random winner from eligible participants.
// Body (optional): { excludePreviousWinners: boolean (default true) }
// The selection happens server-side so it can't be manipulated from the browser.
exports.draw = async (req, res, next) => {
  try {
    const excludePrev = req.body?.excludePreviousWinners !== false;
    const query = excludePrev ? { isWinner: false } : {};
    const pool = await LuckyDrawParticipant.find(query);
    if (pool.length === 0) {
      return error(res, excludePrev
        ? 'No eligible participants left (all have already won). Reset wins to draw again.'
        : 'No participants to draw from.', 400);
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    winner.isWinner = true;
    winner.drawnAt = new Date();
    await winner.save();
    success(res, { winner, totalEligible: pool.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/lucky-draw/reset-wins — un-mark all winners so they're eligible again.
exports.resetWins = async (req, res, next) => {
  try {
    const result = await LuckyDrawParticipant.updateMany(
      { isWinner: true },
      { $set: { isWinner: false, drawnAt: null } }
    );
    success(res, { reset: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};
