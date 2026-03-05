const router = require('express').Router();
const {
  getNotifications, markRead, markAllRead, savePushSubscription,
} = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.post('/subscribe', savePushSubscription);

module.exports = router;
