const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDeviceService, updateDeviceService } = require('../validators/deviceServiceValidator');
const ctrl = require('../controllers/deviceServiceController');

router.use(auth);

// Device Types — must come before /:id routes
router.get('/types', ctrl.getTypes);
router.post('/types', ctrl.createType);
router.delete('/types/:id', ctrl.deleteType);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', validate(createDeviceService), ctrl.create);
router.put('/:id', validate(updateDeviceService), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
