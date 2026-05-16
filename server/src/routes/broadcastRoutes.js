const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/responseHelper');
const whatsappBot = require('../services/whatsappBotService');
const summaryService = require('../services/summaryService');

// 3s between WhatsApp messages — safer rate limit
const SEND_DELAY_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ensure broadcast upload dir exists
const uploadDir = path.join(__dirname, '../../uploads/broadcast');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for broadcast media
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',        // images
    '.mp4', '.mov', '.avi', '.webm',                   // videos
    '.mp3', '.wav', '.ogg', '.m4a',                    // audio
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', // documents
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// All routes require auth
router.use(auth);

// POST /api/broadcast/upload - Upload broadcast media files
router.post('/upload', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return error(res, 'No files uploaded', 400);
  }

  const files = req.files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimetype: f.mimetype,
    url: `/uploads/broadcast/${f.filename}`,
  }));

  success(res, files, 201);
});

// DELETE /api/broadcast/upload/:filename - Delete an uploaded file
router.delete('/upload/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  success(res, { message: 'File deleted' });
});

// ── WhatsApp bot integration ────────────────────────────────────────────────

// GET /api/broadcast/bot-status
router.get('/bot-status', (req, res) => {
  success(res, whatsappBot.getStatus());
});

// GET /api/broadcast/bot-qr — QR code (data URL) when scan is needed
router.get('/bot-qr', (req, res) => {
  success(res, { qrDataUrl: whatsappBot.getQR() });
});

// POST /api/broadcast/bot-restart  body: { clearSession?: boolean }
// Restarts the WhatsApp bot. If clearSession is true (e.g., after a LOGOUT),
// also wipes the session folder so a fresh QR is generated.
router.post('/bot-restart', async (req, res) => {
  try {
    const clearSession = !!(req.body && req.body.clearSession);
    // Respond immediately — restart can take 10-30s, don't block the request
    success(res, { message: clearSession ? 'Restart with fresh session triggered' : 'Restart triggered' });
    whatsappBot.restart({ clearSession }).catch((e) => console.error('[WA] restart failed:', e.message));
  } catch (err) {
    error(res, err.message || 'Restart failed', 500);
  }
});

// POST /api/broadcast/send
// Body: { recipients: [{ phone, name }], message: string }
// Sends the (personalized) text to each recipient via the WhatsApp bot with a
// short delay between sends to avoid rate-limiting.
router.post('/send', async (req, res) => {
  try {
    const { recipients, message } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return error(res, 'No recipients', 400);
    }
    if (!message || !String(message).trim()) {
      return error(res, 'Message is required', 400);
    }

    const status = whatsappBot.getStatus();
    if (!status.ready) {
      return error(res, `WhatsApp bot is not ready (status: ${status.status}). Scan QR on the Broadcast page first.`, 503);
    }

    const results = { sent: 0, failed: 0, total: recipients.length, errors: [] };
    for (const r of recipients) {
      const phone = String(r?.phone || '').replace(/\D/g, '');
      if (!phone) {
        results.failed += 1;
        results.errors.push({ phone: r?.phone, name: r?.name, error: 'invalid phone' });
        continue;
      }
      const personalized = String(message).replace(/\{name\}/g, r.name || 'Customer');
      try {
        await whatsappBot.send(phone, personalized);
        results.sent += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push({ phone, name: r.name, error: err.message });
      }
      // Rate-limit between messages (3s) to avoid WhatsApp throttling
      await sleep(SEND_DELAY_MS);
    }

    success(res, results);
  } catch (err) {
    error(res, err.message || 'Send failed', 500);
  }
});

// ── Smart Summary Broadcasts ────────────────────────────────────────────────

// POST /api/broadcast/summary/preview
// Body: { audience: 'owners' | 'workers' | 'customers' }
// Builds the per-recipient summaries WITHOUT sending. Returns the recipient
// list + the message that would be sent, so the UI can show a preview.
router.post('/summary/preview', async (req, res) => {
  try {
    const { audience, ownerPhones } = req.body || {};
    if (!['owners', 'workers', 'customers'].includes(audience)) {
      return error(res, 'audience must be owners | workers | customers', 400);
    }
    const { recipients, skipped } = await summaryService.buildSummary(audience, { ownerPhones });
    success(res, { audience, total: recipients.length, recipients, skipped });
  } catch (err) {
    error(res, err.message || 'Preview failed', 500);
  }
});

// POST /api/broadcast/summary/send
// Body: { audience: 'owners' | 'workers' | 'customers' }
// Builds the recipient list, then sends each personalised message via the bot
// with a 3s delay between sends.
router.post('/summary/send', async (req, res) => {
  try {
    const { audience, ownerPhones } = req.body || {};
    if (!['owners', 'workers', 'customers'].includes(audience)) {
      return error(res, 'audience must be owners | workers | customers', 400);
    }
    const status = whatsappBot.getStatus();
    if (!status.ready) {
      return error(res, `WhatsApp bot is not ready (status: ${status.status}). Scan QR first.`, 503);
    }

    const { recipients, skipped } = await summaryService.buildSummary(audience, { ownerPhones });
    if (recipients.length === 0) {
      return success(res, { audience, sent: 0, failed: 0, total: 0, skipped, errors: [], note: 'Nothing to send' });
    }

    const results = { audience, sent: 0, failed: 0, total: recipients.length, errors: [], skipped };
    for (const r of recipients) {
      const phone = String(r.phone || '').replace(/\D/g, '');
      if (!phone) {
        results.failed += 1;
        results.errors.push({ phone: r.phone, name: r.name, error: 'invalid phone' });
        continue;
      }
      try {
        await whatsappBot.send(phone, r.message);
        results.sent += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push({ phone, name: r.name, error: err.message });
      }
      await sleep(SEND_DELAY_MS);
    }

    success(res, results);
  } catch (err) {
    error(res, err.message || 'Summary send failed', 500);
  }
});

module.exports = router;
