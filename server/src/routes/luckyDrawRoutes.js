const router = require('express').Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createParticipant, updateParticipant } = require('../validators/luckyDrawValidator');
const ctrl = require('../controllers/luckyDrawController');

router.use(auth);

router.get('/', ctrl.getAll);
router.post('/', validate(createParticipant), ctrl.create);
router.put('/:id', validate(updateParticipant), ctrl.update);
router.delete('/:id', ctrl.remove);

// Draw + reset wins
router.post('/draw', ctrl.draw);
router.post('/reset-wins', ctrl.resetWins);

module.exports = router;
