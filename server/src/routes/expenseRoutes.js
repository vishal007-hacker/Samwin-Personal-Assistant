const router = require('express').Router();
const {
  getExpenses, getExpense, getSummary, getCategories, createCategory, deleteCategory,
  createExpense, updateExpense, deleteExpense,
} = require('../controllers/expenseController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createExpense: createSchema, updateExpense: updateSchema } = require('../validators/expenseValidator');

router.use(auth);
router.get('/', getExpenses);
router.get('/summary', getSummary);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.delete('/categories/:name', deleteCategory);
router.get('/:id', getExpense);
router.post('/', validate(createSchema), createExpense);
router.put('/:id', validate(updateSchema), updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
