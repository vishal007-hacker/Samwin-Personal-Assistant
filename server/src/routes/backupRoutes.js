const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const ctrl = require('../controllers/backupController');

// In-memory upload for restore — JSON files only, up to 50 MB
const restoreUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json backup files are accepted'), false);
    }
  },
});

// Backup endpoints — admin only (data export/restore contains sensitive info)
router.use(auth);
router.use(roleCheck('admin'));

router.get('/data', ctrl.getDataBackup);
router.get('/full', ctrl.getFullBackup);
router.post('/restore', restoreUpload.single('file'), ctrl.restoreBackup);

module.exports = router;
