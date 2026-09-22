const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const assetController = require('../controllers/assetController');
const { authenticate } = require('../middleware/authMiddleware');

// Configure Multer for memory storage (for direct S3 upload)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', authenticate, upload.single('media'), assetController.uploadAsset);
router.get('/', authenticate, assetController.getAssets);
router.post('/process', authenticate, assetController.processAsset);
router.get('/jobs/:jobId', authenticate, assetController.getJobStatus);

module.exports = router;
