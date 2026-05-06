const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createEmployee, updateEmployee } = require('../validators/employeeValidator');
const ctrl = require('../controllers/employeeController');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.get('/:id/salary-report', ctrl.salaryReport);
router.post('/', validate(createEmployee), ctrl.create);
router.put('/:id', validate(updateEmployee), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
