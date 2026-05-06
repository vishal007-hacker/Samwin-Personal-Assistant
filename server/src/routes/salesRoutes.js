const router = require('express').Router();
const {
  getCategories, createCategory, updateCategory, deleteCategory,
  getSales, getSummary, getReport, createSale, updateSale, deleteSale,
} = require('../controllers/salesController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCategory: createCatSchema, updateCategory: updateCatSchema,
  createSale: createSchema, updateSale: updateSchema,
} = require('../validators/salesValidator');

router.use(auth);
router.get('/categories', getCategories);
router.post('/categories', validate(createCatSchema), createCategory);
router.put('/categories/:id', validate(updateCatSchema), updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/summary', getSummary);
router.get('/report', getReport);
router.get('/', getSales);
router.post('/', validate(createSchema), createSale);
router.put('/:id', validate(updateSchema), updateSale);
router.delete('/:id', deleteSale);

module.exports = router;
