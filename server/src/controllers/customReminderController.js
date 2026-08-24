const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/custom-reminders
exports.getAll = async (req, res, next) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const docs = await prisma.customReminder.findMany({ where, orderBy: { nextTrigger: 'asc' } });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// GET /api/custom-reminders/due — get reminders that need to popup now
exports.getDue = async (req, res, next) => {
  try {
    const now = new Date();

    const dueReminders = await prisma.customReminder.findMany({
      where: {
        isActive: true,
        nextTrigger: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { nextTrigger: 'asc' },
    });

    // Advance each triggered reminder to its next interval
    for (const rem of dueReminders) {
      const nextTime = new Date(now.getTime() + rem.intervalMinutes * 60 * 1000);
      await prisma.customReminder.update({
        where: { id: rem.id },
        data: {
          lastTriggered: now,
          triggerCount: { increment: 1 },
          isActive: nextTime > rem.endDate ? false : true,
          nextTrigger: nextTime > rem.endDate ? rem.nextTrigger : nextTime,
        },
      });
    }

    // Also deactivate any expired reminders
    await prisma.customReminder.updateMany({
      where: { isActive: true, endDate: { lt: now } },
      data: { isActive: false },
    });

    success(res, many(dueReminders));
  } catch (err) {
    next(err);
  }
};

// GET /api/custom-reminders/:id
exports.getOne = async (req, res, next) => {
  try {
    const doc = await prisma.customReminder.findUnique({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, one(doc));
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

    const doc = await prisma.customReminder.create({
      data: { title, intervalMinutes, endDate, nextTrigger, createdById: req.user.id },
    });

    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/custom-reminders/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.customReminder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Reminder not found', 404);
    next(err);
  }
};

// PUT /api/custom-reminders/:id/stop — deactivate
exports.stop = async (req, res, next) => {
  try {
    const doc = await prisma.customReminder.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Reminder not found', 404);
    next(err);
  }
};

// DELETE /api/custom-reminders/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.customReminder.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Reminder not found', 404);
    success(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Reminder not found', 404);
    next(err);
  }
};