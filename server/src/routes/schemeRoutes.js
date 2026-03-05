const router = require('express').Router();
const {
  getSchemes, getScheme, createScheme, updateScheme, deleteScheme, getSchemeTypes,
} = require('../controllers/schemeController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { createScheme: createSchema, updateScheme: updateSchema } = require('../validators/schemeValidator');

router.use(auth);
router.get('/types', getSchemeTypes);
router.get('/', getSchemes);
router.get('/:id', getScheme);
router.post('/', roleCheck('admin'), validate(createSchema), createScheme);
router.put('/:id', roleCheck('admin'), validate(updateSchema), updateScheme);
router.delete('/:id', roleCheck('admin'), deleteScheme);

module.exports = router;
