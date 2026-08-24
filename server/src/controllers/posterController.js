const prisma = require('../config/prisma');
const { success, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');
const bibleVerseService = require('../services/bibleVerseService');

// GET /api/posters/verse-of-day
exports.getVerseOfDay = async (req, res, next) => {
  try {
    const verse = await bibleVerseService.getVerseOfDay();
    success(res, verse);
  } catch (err) {
    next(err);
  }
};

// GET /api/posters/verse?ref=John+3:16
exports.getVerse = async (req, res, next) => {
  try {
    const ref = String(req.query.ref || '').trim();
    if (!ref) return error(res, 'ref query param is required', 400);
    const verse = await bibleVerseService.fetchVerse(ref);
    success(res, verse);
  } catch (err) {
    return error(res, err.message || 'Failed to fetch verse', 502);
  }
};

// GET /api/posters
exports.getAll = async (req, res, next) => {
  try {
    const docs = await prisma.poster.findMany({ orderBy: { createdAt: 'desc' } });
    success(res, many(docs));
  } catch (err) {
    next(err);
  }
};

// POST /api/posters
exports.create = async (req, res, next) => {
  try {
    const { title, bodyText, footer, theme, style, isFavorite } = req.body;
    if (!bodyText || !String(bodyText).trim()) {
      return error(res, 'bodyText is required', 400);
    }
    const doc = await prisma.poster.create({
      data: {
        title,
        bodyText,
        footer,
        theme,
        style,
        isFavorite: !!isFavorite,
        createdById: req.user.id,
      },
    });
    success(res, one(doc), 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/posters/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await prisma.poster.update({ where: { id: req.params.id }, data: req.body });
    if (!doc) return error(res, 'Poster not found', 404);
    success(res, one(doc));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Poster not found', 404);
    next(err);
  }
};

// DELETE /api/posters/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await prisma.poster.delete({ where: { id: req.params.id } });
    if (!doc) return error(res, 'Poster not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Poster not found', 404);
    next(err);
  }
};