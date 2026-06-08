const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/posterController');

router.use(auth);

// Bible verse endpoints
router.get('/verse-of-day', ctrl.getVerseOfDay);
router.get('/verse', ctrl.getVerse);

// Saved posters CRUD
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
