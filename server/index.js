const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDB, getIsConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const storyRoutes = require('./routes/storyRoutes');
const { router: audioRouter, serveAudioFile, syncLocalUploadsToDb } = require('./routes/audioRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Eagerly initiate database connection in background & sync audio assets to Atlas
if (process.env.MONGODB_URI) {
  connectDB()
    .then(() => syncLocalUploadsToDb())
    .catch(err => console.warn('Initial MongoDB connection deferred:', err.message));
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistent audio streaming route with Range support (MongoDB Atlas + disk fallback)
app.get('/uploads/audio/:filename', serveAudioFile);

// Static serving for uploaded media
const uploadStaticDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadStaticDir));

// Middleware to ensure DB connection is ready before processing API routes
app.use(async (req, res, next) => {
  if (process.env.MONGODB_URI && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
    try {
      await connectDB();
    } catch (err) {
      console.error(`[DB Middleware] Connection failed for ${req.method} ${req.path}:`, err.message);
      // For mutations on stories, return an explicit 503 so client knows DB is down
      if (req.path.startsWith('/api/stories') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return res.status(503).json({
          success: false,
          message: `Database connection error (${err.message}). Story could not be saved. Please verify MONGODB_URI in Vercel settings.`
        });
      }
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/audio', audioRouter);

// Detailed Health Check with live Database Diagnostics
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbHost = null;
  let dbError = null;

  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        dbStatus = 'connected';
        dbHost = mongoose.connection.host;
      } else {
        dbStatus = `connecting (readyState: ${mongoose.connection ? mongoose.connection.readyState : 'none'})`;
      }
    } catch (err) {
      dbStatus = 'error';
      dbError = err.message;
    }
  } else {
    dbStatus = 'no_uri_configured (in-memory)';
  }

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Story Creator API',
    database: {
      status: dbStatus,
      connected: dbStatus === 'connected',
      host: dbHost,
      error: dbError,
      hasMongoUri: !!process.env.MONGODB_URI
    }
  });
});

// Root API welcome
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Public Story Book API with Line-Synced Audio',
    version: '1.0.0',
    endpoints: {
      publicStories: '/api/stories',
      adminStories: '/api/stories/admin/all',
      auth: '/api/auth/login',
      audioPresets: '/api/auth/presets'
    }
  });
});

// Start listener if executed directly (not when imported as a serverless function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Story Creator API Server listening on http://localhost:${PORT}`);
    console.log(`📚 Public stories at http://localhost:${PORT}/api/stories`);
    console.log(`🔐 Admin login ready with default credentials (admin / admin123)`);
  });
}

module.exports = app;
