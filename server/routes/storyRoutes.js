const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { requireAdmin } = require('../middleware/auth');

// Public Reader routes
router.get('/', storyController.getPublicStories);
router.get('/:slugOrId', storyController.getPublicStory);

// Admin Protected routes
router.get('/admin/all', requireAdmin, storyController.getAdminStories);
router.get('/admin/:id', requireAdmin, storyController.getAdminStory);
router.post('/admin', requireAdmin, storyController.createStory);
router.put('/admin/:id', requireAdmin, storyController.updateStory);
router.patch('/admin/:id/status', requireAdmin, storyController.toggleStatus);
router.delete('/admin/:id', requireAdmin, storyController.deleteStory);

module.exports = router;
