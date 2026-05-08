const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAccount, updateAccount } = require('../validators/accountValidator');
const ctrl = require('../controllers/accountController');

router.use(auth);

// Snapshots (must come before /:id routes)
router.get('/snapshots', ctrl.getSnapshots);
router.post('/snapshots', ctrl.saveSnapshot);
router.delete('/snapshots/:id', ctrl.deleteSnapshot);

router.get('/', ctrl.getAll);
router.post('/', validate(createAccount), ctrl.create);
router.put('/:id', validate(updateAccount), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
