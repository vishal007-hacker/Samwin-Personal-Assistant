const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createService, updateService } = require('../validators/serviceValidator');
const ctrl = require('../controllers/serviceController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createService), ctrl.create);
router.put('/:id', validate(updateService), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
