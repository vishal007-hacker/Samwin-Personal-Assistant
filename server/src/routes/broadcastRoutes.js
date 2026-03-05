const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/responseHelper');

// Ensure broadcast upload dir exists
const uploadDir = path.join(__dirname, '../../uploads/broadcast');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for broadcast media
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',        // images
    '.mp4', '.mov', '.avi', '.webm',                   // videos
    '.mp3', '.wav', '.ogg', '.m4a',                    // audio
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', // documents
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// All routes require auth
router.use(auth);

// POST /api/broadcast/upload - Upload broadcast media files
router.post('/upload', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return error(res, 'No files uploaded', 400);
  }

  const files = req.files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    mimetype: f.mimetype,
    url: `/uploads/broadcast/${f.filename}`,
  }));

  success(res, files, 201);
});

// DELETE /api/broadcast/upload/:filename - Delete an uploaded file
router.delete('/upload/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  success(res, { message: 'File deleted' });
});

module.exports = router;
