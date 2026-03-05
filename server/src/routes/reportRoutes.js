const router = require('express').Router();
const {
  premiumCollection, policyWise, customerWise, schemeWise,
} = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/premium-collection', premiumCollection);
router.get('/policy-wise', policyWise);
router.get('/customer-wise', customerWise);
router.get('/scheme-wise', schemeWise);

module.exports = router;
