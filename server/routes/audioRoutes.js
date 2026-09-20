const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AudioFile = require('../models/AudioFile');
const { getIsConnected } = require('../config/db');
const { AUDIO_PRESETS } = require('../utils/presets');

// Local upload directory (for local development caching)
const uploadDir = process.env.VERCEL ? '/tmp/uploads/audio' : path.join(__dirname, '../uploads/audio');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not initialize upload directory:', err.message);
}

// Use memory storage so file buffer is always available for MongoDB storage
const storage = multer.memoryStorage();

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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max (fits MongoDB 16MB doc limit)
  fileFilter: fileFilter
});

// Helper to serve audio with HTTP Range support (crucial for mobile iOS/Android)
const serveAudioBuffer = (req, res, buffer, contentType = 'audio/mpeg') => {
  const total = buffer.length;
  const range = req.headers.range;

  res.set('Accept-Ranges', 'bytes');
  res.set('Content-Type', contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

    if (start >= total || end >= total || start > end) {
      res.status(416).set('Content-Range', `bytes */${total}`).end();
      return;
    }

    const chunksize = (end - start) + 1;
    res.status(206);
    res.set('Content-Range', `bytes ${start}-${end}/${total}`);
    res.set('Content-Length', chunksize);
    res.send(buffer.subarray(start, end + 1));
  } else {
    res.status(200);
    res.set('Content-Length', total);
    res.send(buffer);
  }
};

// Main audio file streaming handler (checks local disk first, then MongoDB Atlas)
const serveAudioFile = async (req, res) => {
  const filename = path.basename(req.params.filename);

  // 1. Check if file is available on local disk
  const localPath = path.join(uploadDir, filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // Also check server/uploads/audio in workspace
  const workspacePath = path.join(__dirname, '../uploads/audio', filename);
  if (fs.existsSync(workspacePath)) {
    return res.sendFile(workspacePath);
  }

  // 2. Fallback to MongoDB Atlas (where uploaded files are persistently stored across Vercel lambdas)
  try {
    const fileDoc = await AudioFile.findOne({ filename });
    if (fileDoc && fileDoc.data) {
      // Cache to /tmp if on Vercel for next time
      try {
        fs.writeFileSync(localPath, fileDoc.data);
      } catch (e) {}

      return serveAudioBuffer(req, res, fileDoc.data, fileDoc.contentType || 'audio/mpeg');
    }
  } catch (err) {
    console.error(`[Audio Server] Error querying MongoDB for ${filename}:`, err.message);
  }

  // 3. File truly not found: return clean 404
  res.status(404).json({
    success: false,
    message: `Audio file "${filename}" not found.`
  });
};

// Automatically seed any existing files on disk into MongoDB Atlas on startup
const syncLocalUploadsToDb = async () => {
  try {
    const localDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(localDir)) return;
    const files = fs.readdirSync(localDir);
    for (const file of files) {
      if (!file.endsWith('.mp3') && !file.endsWith('.wav') && !file.endsWith('.ogg')) continue;
      const existing = await AudioFile.findOne({ filename: file });
      if (!existing) {
        const filePath = path.join(localDir, file);
        const data = fs.readFileSync(filePath);
        await AudioFile.create({
          filename: file,
          originalName: file,
          title: file.replace(/[-_]/g, ' ').replace(/\.mp3$/i, ''),
          contentType: 'audio/mpeg',
          size: data.length,
          data
        });
        console.log(`✅ [Audio Sync] Uploaded ${file} to MongoDB Atlas for Vercel`);
      }
    }
  } catch (err) {
    console.warn('[Audio Sync] Notice syncing local audio to DB:', err.message);
  }
};

// POST /api/audio/upload - Upload an audio file with MongoDB Atlas persistence
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file provided.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp3';
    const sanitized = req.file.originalname
      .replace(ext, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const filename = `${sanitized}-${uniqueSuffix}${ext}`;
    const cleanTitle = path.basename(req.file.originalname, ext)
      .replace(/[-_]/g, ' ')
      .trim();

    // 1. Save to MongoDB Atlas for 100% persistent storage across all Vercel instances
    try {
      await AudioFile.create({
        filename,
        originalName: req.file.originalname,
        title: cleanTitle || 'Uploaded Soundtrack',
        contentType: req.file.mimetype || 'audio/mpeg',
        size: req.file.size,
        data: req.file.buffer
      });
    } catch (dbErr) {
      console.warn('[Audio Upload] Warning saving to MongoDB Atlas:', dbErr.message);
    }

    // 2. Also write to local disk/tmp cache
    try {
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    } catch (fsErr) {
      console.warn('[Audio Upload] Warning writing to disk cache:', fsErr.message);
    }

    const fileUrl = `/uploads/audio/${filename}`;

    res.json({
      success: true,
      message: 'Audio file uploaded and permanently saved',
      data: {
        title: cleanTitle || 'Uploaded Soundtrack',
        filename: filename,
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

// GET /api/audio/file/:filename - Direct API audio streaming
router.get('/file/:filename', serveAudioFile);

// GET /api/audio/uploaded - List existing uploaded audio files (merged from MongoDB Atlas + disk)
router.get('/uploaded', async (req, res) => {
  try {
    const fileMap = new Map();

    // 1. Read from MongoDB Atlas
    try {
      const dbFiles = await AudioFile.find().select('-data').sort({ createdAt: -1 });
      dbFiles.forEach(f => {
        fileMap.set(f.filename, {
          filename: f.filename,
          title: f.title || f.filename,
          audioUrl: `/uploads/audio/${f.filename}`,
          size: f.size,
          createdAt: f.createdAt
        });
      });
    } catch (dbErr) {
      console.warn('[Audio List] Notice querying MongoDB Atlas:', dbErr.message);
    }

    // 2. Read from local disk cache
    if (fs.existsSync(uploadDir)) {
      fs.readdirSync(uploadDir).forEach(file => {
        if (!fileMap.has(file)) {
          const stats = fs.statSync(path.join(uploadDir, file));
          const cleanTitle = path.basename(file, path.extname(file))
            .replace(/[-_]/g, ' ')
            .replace(/\d{6,}.*$/, '')
            .trim();
          fileMap.set(file, {
            filename: file,
            title: cleanTitle || file,
            audioUrl: `/uploads/audio/${file}`,
            size: stats.size,
            createdAt: stats.birthtime
          });
        }
      });
    }

    const files = Array.from(fileMap.values());
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

module.exports = {
  router,
  serveAudioFile,
  syncLocalUploadsToDb
};
