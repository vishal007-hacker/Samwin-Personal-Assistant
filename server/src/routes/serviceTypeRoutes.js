const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/serviceTypeController');

router.use(auth);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
