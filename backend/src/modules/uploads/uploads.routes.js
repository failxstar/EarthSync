const express = require('express');
const multer = require('multer');
const { uploadImage } = require('./uploads.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted'));
    }
  }
});

router.post('/', requireAuth, upload.single('image'), uploadImage);

module.exports = router;
