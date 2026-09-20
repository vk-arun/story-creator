const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdmin } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', requireAdmin, authController.me);
router.get('/presets', authController.getPresets);

module.exports = router;
