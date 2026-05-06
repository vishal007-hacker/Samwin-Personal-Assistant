const CustomReminder = require('../models/CustomReminder');
const { success, error } = require('../utils/responseHelper');

// GET /api/custom-reminders
exports.getAll = async (req, res, next) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;
    if (active === 'false') query.isActive = false;

    const docs = await CustomReminder.find(query).sort({ nextTrigger: 1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// GET /api/custom-reminders/due — get reminders that need to popup now
exports.getDue = async (req, res, next) => {
  try {
    const now = new Date();

    const dueReminders = await CustomReminder.find({
      isActive: true,
      nextTrigger: { $lte: now },
      endDate: { $gte: now },
    }).sort({ nextTrigger: 1 });

    // Advance each triggered reminder to its next interval
    for (const rem of dueReminders) {
      rem.lastTriggered = now;
      rem.triggerCount += 1;
      const nextTime = new Date(now.getTime() + rem.intervalMinutes * 60 * 1000);
      if (nextTime > rem.endDate) {
        rem.isActive = false;
      } else {
        rem.nextTrigger = nextTime;
      }
      await rem.save();
    }

    // Also deactivate any expired reminders
    await CustomReminder.updateMany(
      { isActive: true, endDate: { $lt: now } },
      { isActive: false }
    );

    success(res, dueReminders);
  } catch (err) {
    next(err);
  }
};

// GET /api/custom-reminders/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await CustomReminder.findById(req.params.id);
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/custom-reminders
exports.create = async (req, res, next) => {
  try {
    const { title, intervalMinutes, endDate } = req.body;

    // First trigger = now + interval
    const nextTrigger = new Date(Date.now() + intervalMinutes * 60 * 1000);

    const doc = await CustomReminder.create({
      title,
      intervalMinutes,
      endDate,
      nextTrigger,
      createdBy: req.user._id,
    });

    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/custom-reminders/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await CustomReminder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// PUT /api/custom-reminders/:id/stop — deactivate
exports.stop = async (req, res, next) => {
  try {
    const doc = await CustomReminder.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/custom-reminders/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await CustomReminder.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
