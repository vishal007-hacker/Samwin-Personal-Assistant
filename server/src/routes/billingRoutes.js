const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBilling, updateBilling } = require('../validators/billingValidator');
const ctrl = require('../controllers/billingController');

router.use(auth);

router.get('/next-number/:type', ctrl.getNextNumber);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createBilling), ctrl.create);
router.put('/:id', validate(updateBilling), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
