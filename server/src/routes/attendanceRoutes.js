const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAttendance, updateAttendance } = require('../validators/attendanceValidator');
const ctrl = require('../controllers/attendanceController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createAttendance), ctrl.create);
router.put('/:id', validate(updateAttendance), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
