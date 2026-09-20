const jwt = require('jsonwebtoken');
const dataService = require('../services/dataService');
const { JWT_SECRET } = require('../middleware/auth');
const { AUDIO_PRESETS } = require('../utils/presets');

const authController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
      }

      const user = await dataService.authenticateAdmin(username, password);

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Admin authenticated successfully',
        token,
        user: {
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
  },

  // GET /api/auth/me
  async me(req, res) {
    res.json({
      success: true,
      user: {
        username: req.user.username,
        role: req.user.role
      }
    });
  },

  // GET /api/audio/presets
  async getPresets(req, res) {
    res.json({
      success: true,
      presets: AUDIO_PRESETS
    });
  }
};

module.exports = authController;
