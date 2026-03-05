const router = require('express').Router();
const {
  getPolicies, getPolicy, createPolicy, updatePolicy, deletePolicy, uploadDocument, deleteDocument,
} = require('../controllers/policyController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createPolicy: createSchema, updatePolicy: updateSchema } = require('../validators/policyValidator');

router.use(auth);
router.get('/', getPolicies);
router.get('/:id', getPolicy);
router.post('/', validate(createSchema), createPolicy);
router.put('/:id', validate(updateSchema), updatePolicy);
router.delete('/:id', roleCheck('admin'), deletePolicy);
router.post('/:id/documents', upload.single('document'), uploadDocument);
router.delete('/:id/documents/:docId', deleteDocument);

module.exports = router;
