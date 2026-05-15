const AllowedNumber = require('../models/AllowedNumber');
const AIConversation = require('../models/AIConversation');
const AISettings = require('../models/AISettings');
const whatsappBot = require('../services/whatsappBotService');
const aiNotification = require('../services/aiNotificationService');
const { success, error } = require('../utils/responseHelper');

// ── Bot status & QR ─────────────────────────────────────────────────────────

// GET /api/ai/status
exports.getStatus = async (req, res, next) => {
  try {
    const status = whatsappBot.getStatus();
    success(res, status);
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/qr — returns the current QR as a PNG data URL (or null)
exports.getQR = async (req, res, next) => {
  try {
    success(res, { qrDataUrl: whatsappBot.getQR() });
  } catch (err) {
    next(err);
  }
};

// ── Allowed numbers (whitelist) ─────────────────────────────────────────────

// GET /api/ai/allowed-numbers
exports.getAllowedNumbers = async (req, res, next) => {
  try {
    const docs = await AllowedNumber.find({}).sort({ createdAt: -1 });
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/allowed-numbers
exports.createAllowedNumber = async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').replace(/\D/g, '');
    if (!phone) return error(res, 'Invalid phone', 400);
    const existing = await AllowedNumber.findOne({ phone });
    if (existing) return error(res, 'Phone already in whitelist', 400);
    const doc = await AllowedNumber.create({
      ...req.body,
      phone,
      createdBy: req.user._id,
    });
    success(res, doc, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/ai/allowed-numbers/:id
exports.updateAllowedNumber = async (req, res, next) => {
  try {
    if (req.body.phone) {
      req.body.phone = String(req.body.phone).replace(/\D/g, '');
    }
    const doc = await AllowedNumber.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return error(res, 'Not found', 404);
    success(res, doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/ai/allowed-numbers/:id
exports.deleteAllowedNumber = async (req, res, next) => {
  try {
    const doc = await AllowedNumber.findByIdAndDelete(req.params.id);
    if (!doc) return error(res, 'Not found', 404);
    success(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// ── Conversations (audit log) ───────────────────────────────────────────────

// GET /api/ai/conversations?phone=&limit=50
exports.getConversations = async (req, res, next) => {
  try {
    const { phone, limit = 100 } = req.query;
    const query = {};
    if (phone) query.phone = String(phone).replace(/\D/g, '');
    const docs = await AIConversation.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500));
    success(res, docs);
  } catch (err) {
    next(err);
  }
};

// ── Settings ────────────────────────────────────────────────────────────────

// GET /api/ai/settings
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await AISettings.get();
    success(res, settings);
  } catch (err) {
    next(err);
  }
};

// PUT /api/ai/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await AISettings.findOneAndUpdate(
      { _id: 'default' },
      { $set: req.body, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    // Reload cron schedule with new time/enabled flag
    try { await aiNotification.reloadSchedule(); } catch (e) { console.error('[AI] reloadSchedule:', e.message); }
    success(res, settings);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/test-notification?type=daily-summary
exports.testNotification = async (req, res, next) => {
  try {
    const aiNotif = require('../services/aiNotificationService');
    const type = req.query.type || 'daily-summary';
    const message = await aiNotif.runNotification(type);
    success(res, { type, sent: true, message });
  } catch (err) {
    next(err);
  }
};

// ── Test prompt (web-based, no WhatsApp needed) ─────────────────────────────

// POST /api/ai/test
exports.testPrompt = async (req, res, next) => {
  try {
    const aiAgent = require('../services/aiAgentService');
    if (!aiAgent || !aiAgent.handleMessage) {
      return error(res, 'AI agent not initialized', 503);
    }
    const phone = (req.body.phone || '').replace(/\D/g, '') || 'web-test';
    const reply = await aiAgent.handleMessage({
      phone,
      text: req.body.message,
      source: 'web-test',
      bypassWhitelist: true,
    });
    success(res, { reply });
  } catch (err) {
    next(err);
  }
};

// ── In-app chat widget (per logged-in user) ─────────────────────────────────

// Returns a per-user conversation key used as the "phone" identifier.
// Format: "web:<userId>" so it never collides with real WhatsApp numbers.
function webKeyFor(user) {
  return `web:${user._id}`;
}

// POST /api/ai/chat
exports.chat = async (req, res, next) => {
  try {
    const aiAgent = require('../services/aiAgentService');
    if (!aiAgent || !aiAgent.handleMessage) {
      return error(res, 'AI agent not initialized', 503);
    }
    const text = (req.body?.message || '').trim();
    if (!text) return error(res, 'message is required', 400);

    const phone = webKeyFor(req.user);
    const reply = await aiAgent.handleMessage({
      phone,
      text,
      source: 'web-test',
      bypassWhitelist: true,
      userId: req.user._id,
    });
    success(res, { reply });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/chat/history
exports.chatHistory = async (req, res, next) => {
  try {
    const phone = webKeyFor(req.user);
    const docs = await AIConversation.find({
      phone,
      role: { $in: ['user', 'assistant'] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    // Return in chronological order
    success(res, docs.reverse());
  } catch (err) {
    next(err);
  }
};

// DELETE /api/ai/chat/history
exports.clearChatHistory = async (req, res, next) => {
  try {
    const phone = webKeyFor(req.user);
    const result = await AIConversation.deleteMany({ phone });
    success(res, { deleted: result.deletedCount });
  } catch (err) {
    next(err);
  }
};
