const dataService = require('../services/dataService');

const storyController = {
  // Public: Get published stories
  async getPublicStories(req, res) {
    try {
      const { genre, search } = req.query;
      const stories = await dataService.getStories({
        isAdmin: false,
        genre,
        search
      });
      res.json({ success: true, count: stories.length, data: stories });
    } catch (error) {
      console.error('Error fetching public stories:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch stories' });
    }
  },

  // Public: Get single published story by slug or ID
  async getPublicStory(req, res) {
    try {
      const { slugOrId } = req.params;
      const story = await dataService.getStory(slugOrId, false);

      if (!story) {
        return res.status(404).json({ success: false, message: 'Story not found or not published' });
      }

      // Asynchronously increment view count
      dataService.incrementView(slugOrId).catch(err => console.error('View count error:', err));

      res.json({ success: true, data: story });
    } catch (error) {
      console.error('Error fetching story:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch story' });
    }
  },

  // Admin: Get all stories (drafts & published)
  async getAdminStories(req, res) {
    try {
      const { status, search, genre } = req.query;
      const stories = await dataService.getStories({
        isAdmin: true,
        status,
        search,
        genre
      });
      res.json({ success: true, count: stories.length, data: stories });
    } catch (error) {
      console.error('Error fetching admin stories:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch admin stories' });
    }
  },

  // Admin: Get story by ID for editing
  async getAdminStory(req, res) {
    try {
      const { id } = req.params;
      const story = await dataService.getStory(id, true);

      if (!story) {
        return res.status(404).json({ success: false, message: 'Story not found' });
      }

      res.json({ success: true, data: story });
    } catch (error) {
      console.error('Error fetching admin story detail:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch story' });
    }
  },

  // Admin: Create new story
  async createStory(req, res) {
    try {
      const { title, content, summary, coverImage, author, genre, status, musicSegments } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Story title is required.' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Story content is required.' });
      }

      // Validate musicSegments ranges if provided
      const validatedSegments = (musicSegments || []).map((seg, idx) => ({
        id: seg.id || `seg-${Date.now()}-${idx}`,
        title: seg.title || `Track ${idx + 1}`,
        audioUrl: seg.audioUrl,
        fromLine: Math.max(1, parseInt(seg.fromLine) || 1),
        toLine: Math.max(1, parseInt(seg.toLine) || 1),
        volume: typeof seg.volume === 'number' ? seg.volume : 0.7,
        loop: seg.loop !== undefined ? !!seg.loop : true
      })).filter(seg => !!seg.audioUrl);

      const newStory = await dataService.createStory({
        title: title.trim(),
        content,
        summary: summary ? summary.trim() : '',
        coverImage: coverImage ? coverImage.trim() : undefined,
        author: author ? author.trim() : req.user?.username || 'Admin',
        genre: genre || 'Fantasy',
        status: status === 'published' ? 'published' : 'draft',
        musicSegments: validatedSegments
      });

      res.status(201).json({
        success: true,
        message: `Story successfully saved as ${newStory.status}.`,
        data: newStory
      });
    } catch (error) {
      console.error('Error creating story:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create story' });
    }
  },

  // Admin: Update existing story
  async updateStory(req, res) {
    try {
      const { id } = req.params;
      const { title, content, summary, coverImage, author, genre, status, musicSegments } = req.body;

      const existing = await dataService.getStory(id, true);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Story not found.' });
      }

      const updatePayload = {};
      if (title !== undefined) updatePayload.title = title.trim();
      if (content !== undefined) updatePayload.content = content;
      if (summary !== undefined) updatePayload.summary = summary.trim();
      if (coverImage !== undefined) updatePayload.coverImage = coverImage.trim();
      if (author !== undefined) updatePayload.author = author.trim();
      if (genre !== undefined) updatePayload.genre = genre;
      if (status !== undefined) updatePayload.status = status;

      if (musicSegments !== undefined) {
        updatePayload.musicSegments = musicSegments.map((seg, idx) => ({
          id: seg.id || `seg-${Date.now()}-${idx}`,
          title: seg.title || `Track ${idx + 1}`,
          audioUrl: seg.audioUrl,
          fromLine: Math.max(1, parseInt(seg.fromLine) || 1),
          toLine: Math.max(1, parseInt(seg.toLine) || 1),
          volume: typeof seg.volume === 'number' ? seg.volume : 0.7,
          loop: seg.loop !== undefined ? !!seg.loop : true
        })).filter(seg => !!seg.audioUrl);
      }

      const updated = await dataService.updateStory(id, updatePayload);

      res.json({
        success: true,
        message: 'Story updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error updating story:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update story' });
    }
  },

  // Admin: Toggle status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const existing = await dataService.getStory(id, true);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Story not found.' });
      }

      const nextStatus = existing.status === 'published' ? 'draft' : 'published';
      const updated = await dataService.updateStory(id, { status: nextStatus });

      res.json({
        success: true,
        message: `Story status changed to ${nextStatus}`,
        data: updated
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle status' });
    }
  },

  // Admin: Delete story
  async deleteStory(req, res) {
    try {
      const { id } = req.params;
      const success = await dataService.deleteStory(id);

      if (!success) {
        return res.status(404).json({ success: false, message: 'Story not found or already deleted.' });
      }

      res.json({ success: true, message: 'Story successfully deleted' });
    } catch (error) {
      console.error('Error deleting story:', error);
      res.status(500).json({ success: false, message: 'Failed to delete story' });
    }
  }
};

module.exports = storyController;
