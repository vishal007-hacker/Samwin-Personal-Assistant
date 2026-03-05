const router = require('express').Router();
const {
  getReminders,
  updateReminderSettings,
  sendWhatsAppReminder,
} = require('../controllers/reminderController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', getReminders);
router.put('/:id/settings', updateReminderSettings);
router.post('/:id/send-whatsapp', sendWhatsAppReminder);

module.exports = router;
