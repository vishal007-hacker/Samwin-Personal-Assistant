const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const ctrl = require('../controllers/systemController');

// Only admins can check and apply system updates
router.use(auth);
router.use(roleCheck('admin'));

router.get('/check-update', ctrl.checkUpdate);
router.post('/apply-update', ctrl.applyUpdate);

module.exports = router;
