const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AUDIO_PRESETS } = require('../utils/presets');

// Ensure upload directory exists (fallback to /tmp on Vercel serverless)
const uploadDir = process.env.VERCEL ? '/tmp/uploads/audio' : path.join(__dirname, '../uploads/audio');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not initialize upload directory:', err.message);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitized = file.originalname
      .replace(ext, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, `${sanitized}-${uniqueSuffix}${ext || '.mp3'}`);
  }
});

// Audio file filter
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm', '.flac'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.mimetype.startsWith('audio/') || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files (.mp3, .wav, .ogg, .m4a, .aac, .webm) are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
  fileFilter: fileFilter
});

// POST /api/audio/upload - Upload an audio file
router.post('/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file provided.' });
    }

    // Relative URL accessible via express.static
    const fileUrl = `/uploads/audio/${req.file.filename}`;
    const cleanTitle = path.basename(req.file.originalname, path.extname(req.file.originalname))
      .replace(/[-_]/g, ' ')
      .trim();

    res.json({
      success: true,
      message: 'Audio file uploaded successfully',
      data: {
        title: cleanTitle || 'Uploaded Soundtrack',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        audioUrl: fileUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'File upload failed' });
  }
});

// GET /api/audio/uploaded - List existing uploaded audio files
router.get('/uploaded', (req, res) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(uploadDir).map(file => {
      const stats = fs.statSync(path.join(uploadDir, file));
      const cleanTitle = path.basename(file, path.extname(file))
        .replace(/[-_]/g, ' ')
        .replace(/\d{6,}.*$/, '')
        .trim();

      return {
        filename: file,
        title: cleanTitle || file,
        audioUrl: `/uploads/audio/${file}`,
        size: stats.size,
        createdAt: stats.birthtime
      };
    });

    res.json({ success: true, files });
  } catch (error) {
    console.error('Fetch uploaded audio error:', error);
    res.status(500).json({ success: false, message: 'Failed to list uploaded audio files' });
  }
});

// GET /api/audio/presets - Royalty-free presets
router.get('/presets', (req, res) => {
  res.json({ success: true, presets: AUDIO_PRESETS });
});

module.exports = router;
