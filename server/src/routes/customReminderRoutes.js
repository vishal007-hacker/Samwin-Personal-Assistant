const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReminder, updateReminder } = require('../validators/customReminderValidator');
const ctrl = require('../controllers/customReminderController');

router.use(auth);

router.get('/due', ctrl.getDue);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createReminder), ctrl.create);
router.put('/:id', validate(updateReminder), ctrl.update);
router.put('/:id/stop', ctrl.stop);
router.delete('/:id', ctrl.remove);

module.exports = router;
