const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const storyRoutes = require('./routes/storyRoutes');
const audioRoutes = require('./routes/audioRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (or enable fallback)
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static serving for uploaded media
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/audio', audioRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Story Creator API'
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

// Start listener if executed directly
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Story Creator API Server listening on http://localhost:${PORT}`);
    console.log(`📚 Public stories at http://localhost:${PORT}/api/stories`);
    console.log(`🔐 Admin login ready with default credentials (admin / admin123)`);
  });
}

module.exports = app;
