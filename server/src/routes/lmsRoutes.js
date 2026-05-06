const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createLMS, updateLMS } = require('../validators/lmsValidator');
const ctrl = require('../controllers/lmsController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createLMS), ctrl.create);
router.put('/:id', validate(updateLMS), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
