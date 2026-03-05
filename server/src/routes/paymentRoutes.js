const router = require('express').Router();
const {
  getPayments, getPolicyPayments, createPayment, updatePayment, deletePayment,
} = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { createPayment: createSchema } = require('../validators/paymentValidator');

router.use(auth);
router.get('/', getPayments);
router.get('/policy/:policyId', getPolicyPayments);
router.post('/', validate(createSchema), createPayment);
router.put('/:id', roleCheck('admin'), updatePayment);
router.delete('/:id', roleCheck('admin'), deletePayment);

module.exports = router;
