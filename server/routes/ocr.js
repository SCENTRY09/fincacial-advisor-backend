const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { handleUpload, handleExtract } = require('../controllers/ocrController');
const { ensureAuthenticated, requireAuth } = require('../middlewares/AuthMiddleware');

// All OCR routes require authentication
router.use(ensureAuthenticated);
router.use(requireAuth);

const os = require('os');
// Use OS temp dir for cross-platform compatibility
const uploadsDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : require('path').join(os.tmpdir(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// Configure multer with better error handling
const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, BMP, WEBP, and PDF files are allowed.'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
};

// Test endpoint to verify OCR service is working
router.get('/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'OCR service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

router.post('/upload-financial-doc', upload.single('file'), handleMulterError, handleUpload);
router.post('/extract-financial-info', handleExtract);

module.exports = router; 