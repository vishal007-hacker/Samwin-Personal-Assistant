const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// POST /api/ai/chat - interact with the AI assistant
router.post('/chat', auth, roleCheck('admin'), aiController.chat);

module.exports = router;
