const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { createAllowedNumber, updateAllowedNumber, testPrompt, updateSettings } = require('../validators/aiValidator');
const ctrl = require('../controllers/aiController');

// All AI routes require admin
router.use(auth);
router.use(roleCheck('admin'));

// Bot status & QR
router.get('/status', ctrl.getStatus);
router.get('/qr', ctrl.getQR);

// Whitelist management
router.get('/allowed-numbers', ctrl.getAllowedNumbers);
router.post('/allowed-numbers', validate(createAllowedNumber), ctrl.createAllowedNumber);
router.put('/allowed-numbers/:id', validate(updateAllowedNumber), ctrl.updateAllowedNumber);
router.delete('/allowed-numbers/:id', ctrl.deleteAllowedNumber);

// Conversation audit
router.get('/conversations', ctrl.getConversations);

// Settings (daily summary time, auto-notify toggles, message tone)
router.get('/settings', ctrl.getSettings);
router.put('/settings', validate(updateSettings), ctrl.updateSettings);

// Test prompt (web-based, no WhatsApp)
router.post('/test', validate(testPrompt), ctrl.testPrompt);

// Manually fire a proactive notification (for testing)
router.post('/test-notification', ctrl.testNotification);

// In-app chat widget (per logged-in admin)
router.post('/chat', ctrl.chat);
router.get('/chat/history', ctrl.chatHistory);
router.delete('/chat/history', ctrl.clearChatHistory);

module.exports = router;
