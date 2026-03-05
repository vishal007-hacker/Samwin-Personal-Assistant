const router = require('express').Router();
const { login, register, getMe, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/login', login);
router.post('/register', auth, roleCheck('admin'), register);
router.get('/me', auth, getMe);
router.put('/change-password', auth, changePassword);

module.exports = router;
