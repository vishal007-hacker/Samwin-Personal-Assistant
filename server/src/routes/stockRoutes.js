const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createStock, updateStock, sellStock } = require('../validators/stockValidator');
const ctrl = require('../controllers/stockController');

router.use(auth);

router.get('/brands', ctrl.getBrands);
router.get('/report/summary', ctrl.getReport);
router.get('/', ctrl.getStocks);
router.get('/:id', ctrl.getStock);
router.post('/', validate(createStock), ctrl.createStock);
router.put('/:id', validate(updateStock), ctrl.updateStock);
router.put('/:id/sell', validate(sellStock), ctrl.sellStock);
router.delete('/:id', ctrl.deleteStock);

module.exports = router;
