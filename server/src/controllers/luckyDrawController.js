const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/lucky-draw
exports.getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { purchaseDetails: { contains: search, mode: 'insensitive' } },
      ];
    }
    const docs = await prisma.luckyDrawParticipant.findMany({ where, orderBy: { serialNo: 'asc' } });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// POST /api/lucky-draw
exports.create = async (req, res, next) => {
  try {
    const counter = await prisma.counter.upsert({
      where: { key: 'luckyDrawSerial' },
      update: { value: { increment: 1 } },
      create: { key: 'luckyDrawSerial', value: 1 },
    });

    const doc = await prisma.luckyDrawParticipant.create({
      data: { ...req.body, serialNo: counter.value, createdById: req.user.id },
    });
    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/lucky-draw/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.luckyDrawParticipant.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!doc) return error(res, 'Participant not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Participant not found', 404);
    next(err);
  }
};

// DELETE /api/lucky-draw/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.luckyDrawParticipant.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Participant not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Participant not found', 404);
    next(err);
  }
};

// POST /api/lucky-draw/draw — pick a random winner from eligible participants.
// Body (optional): { excludePreviousWinners: boolean (default true) }
// The selection happens server-side so it can't be manipulated from the browser.
exports.draw = async (req, res, next) => {
  try {
    const excludePrev = req.body?.excludePreviousWinners !== false;
    const where = excludePrev ? { isWinner: false } : {};
    const pool = await prisma.luckyDrawParticipant.findMany({ where });
    if (pool.length === 0) {
      return error(res, excludePrev
        ? 'No eligible participants left (all have already won). Reset wins to draw again.'
        : 'No participants to draw from.', 400);
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const updated = await prisma.luckyDrawParticipant.update({
      where: { id: winner.id },
      data: { isWinner: true, drawnAt: new Date() },
    });
    success(res, { winner: one(updated), totalEligible: pool.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/lucky-draw/reset-wins — un-mark all winners so they're eligible again.
exports.resetWins = async (req, res, next) => {
  try {
    const result = await prisma.luckyDrawParticipant.updateMany({
      where: { isWinner: true },
      data: { isWinner: false, drawnAt: null },
    });
    success(res, { reset: result.count });
  } catch (err) {
    next(err);
  }
};