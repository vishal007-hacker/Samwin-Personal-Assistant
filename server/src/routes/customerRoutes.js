const router = require('express').Router();
const {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, searchCustomers,
} = require('../controllers/customerController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { createCustomer: createSchema, updateCustomer: updateSchema } = require('../validators/customerValidator');

router.use(auth);
router.get('/search', searchCustomers);
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', validate(createSchema), createCustomer);
router.put('/:id', validate(updateSchema), updateCustomer);
router.delete('/:id', roleCheck('admin'), deleteCustomer);

module.exports = router;
