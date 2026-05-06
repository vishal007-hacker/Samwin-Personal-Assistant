const router = require('express').Router();
const auth = require('../middleware/auth');
const { getToday } = require('../controllers/bibleVerseController');

router.use(auth);
router.get('/today', getToday);

module.exports = router;
