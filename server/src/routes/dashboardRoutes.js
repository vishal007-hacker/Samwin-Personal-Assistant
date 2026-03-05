const router = require('express').Router();
const {
  getStats, getUpcomingReminders, getOverdue, getRecentPolicies, resetAllData,
} = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.get('/stats', getStats);
router.get('/upcoming-reminders', getUpcomingReminders);
router.get('/overdue', getOverdue);
router.get('/recent-policies', getRecentPolicies);
router.delete('/reset', roleCheck('admin'), resetAllData);

module.exports = router;
