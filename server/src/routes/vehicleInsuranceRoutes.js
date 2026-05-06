const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/vehicleInsuranceController');

router.use(auth);

// Insurance types
router.get('/types', ctrl.getTypes);
router.post('/types', ctrl.createType);

// Due reminders
router.get('/due-reminders', ctrl.getDueReminders);

// CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post(
  '/',
  upload.fields([
    { name: 'rcBook', maxCount: 1 },
    { name: 'oldInsurance', maxCount: 1 },
  ]),
  ctrl.create
);
router.put(
  '/:id',
  upload.fields([
    { name: 'rcBook', maxCount: 1 },
    { name: 'oldInsurance', maxCount: 1 },
  ]),
  ctrl.update
);
router.delete('/:id', ctrl.remove);

module.exports = router;
