const Poster = require('../models/Poster');
const { success, error } = require('../utils/responseHelper');
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
    const docs = await Poster.find({}).sort({ createdAt: -1 });
    success(res, docs);
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
    const doc = await Poster.create({
      title,
      bodyText,
      footer,
      theme,
      style,
      isFavorite: !!isFavorite,
      createdBy: req.user._id,
    });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/posters/:id
exports.update = async (req, res, next) => {
  try {
    const doc = await Poster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return error(res, 'Poster not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/posters/:id
exports.remove = async (req, res, next) => {
  try {
    const doc = await Poster.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Poster not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
