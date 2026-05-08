const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProduct, updateProduct, createRecord, updateRecord } = require('../validators/maintenanceValidator');
const ctrl = require('../controllers/maintenanceController');

router.use(auth);

// Products
router.get('/products', ctrl.getProducts);
router.post('/products', validate(createProduct), ctrl.createProduct);
router.put('/products/:id', validate(updateProduct), ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

// Records (history)
router.get('/records', ctrl.getRecords);
router.post('/records', validate(createRecord), ctrl.createRecord);
router.put('/records/:id', validate(updateRecord), ctrl.updateRecord);
router.delete('/records/:id', ctrl.deleteRecord);

module.exports = router;
