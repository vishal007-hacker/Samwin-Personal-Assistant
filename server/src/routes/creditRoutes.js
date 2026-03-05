const router = require('express').Router();
const {
  getCredits, getCredit, getCreditsByCustomer, createCredit, topupCredit, paymentCredit, closeCredit, deleteCredit,
} = require('../controllers/creditController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const {
  createCredit: createSchema,
  topupCredit: topupSchema,
  paymentCredit: paymentSchema,
} = require('../validators/creditValidator');

router.use(auth);
router.get('/', getCredits);
router.get('/customer/:customerId', getCreditsByCustomer);
router.get('/:id', getCredit);
router.post('/', validate(createSchema), createCredit);
router.put('/:id/topup', validate(topupSchema), topupCredit);
router.put('/:id/payment', validate(paymentSchema), paymentCredit);
router.put('/:id/close', closeCredit);
router.delete('/:id', roleCheck('admin'), deleteCredit);

module.exports = router;
