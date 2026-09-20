const bcrypt = require('bcryptjs');
const Story = require('../models/Story');
const User = require('../models/User');
const { getIsConnected } = require('../config/db');
const { initialSeedStories } = require('../utils/seedData');

// Fallback in-memory state
let memoryStories = [...initialSeedStories];
let memoryAdminUser = null;

// Initialize in-memory admin user (admin / admin123)
const initMemoryAdmin = async () => {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  memoryAdminUser = {
    username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    passwordHash: hash,
    role: 'admin'
  };
};
initMemoryAdmin();

// Helper to generate a slug
const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base}-${Math.random().toString(36).substring(2, 6)}`;
};

// Calculate reading time in minutes
const calculateReadTime = (content) => {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 180));
};

// Parse content into distinct lines for music sync
const parseLines = (content) => {
  if (!content) return [];
  return content.split('\n').map(line => line.trimEnd());
};

const dataService = {
  // 1. Get stories with optional filters
  async getStories({ status, genre, search, isAdmin = false }) {
    if (getIsConnected()) {
      const query = {};
      if (!isAdmin) {
        query.status = 'published';
      } else if (status && status !== 'all') {
        query.status = status;
      }
      if (genre && genre !== 'All') {
        query.genre = genre;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { summary: { $regex: search, $options: 'i' } }
        ];
      }
      return await Story.find(query).sort({ createdAt: -1 });
    }

    // In-memory fallback
    let list = [...memoryStories];
    if (!isAdmin) {
      list = list.filter(s => s.status === 'published');
    } else if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }
    if (genre && genre !== 'All') {
      list = list.filter(s => s.genre?.toLowerCase() === genre.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(item => 
        item.title.toLowerCase().includes(s) || 
        (item.summary && item.summary.toLowerCase().includes(s))
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // 2. Get single story by slug or ID
  async getStory(idOrSlug, isAdmin = false) {
    if (getIsConnected()) {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
      const query = isMongoId 
        ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } 
        : { slug: idOrSlug };
      
      const story = await Story.findOne(query);
      if (!story) return null;
      if (!isAdmin && story.status !== 'published') return null;
      return story;
    }

    // In-memory fallback
    const story = memoryStories.find(s => s._id === idOrSlug || s.id === idOrSlug || s.slug === idOrSlug);
    if (!story) return null;
    if (!isAdmin && story.status !== 'published') return null;
    return story;
  },

  // 3. Create a story
  async createStory(storyData) {
    const lines = parseLines(storyData.content || '');
    const readTimeMinutes = calculateReadTime(storyData.content || '');
    const slug = generateSlug(storyData.title);

    const newStoryPayload = {
      title: storyData.title,
      slug,
      summary: storyData.summary || '',
      coverImage: storyData.coverImage || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
      author: storyData.author || 'Admin',
      genre: storyData.genre || 'Fantasy',
      content: storyData.content,
      lines,
      musicSegments: storyData.musicSegments || [],
      status: storyData.status || 'draft',
      readTimeMinutes,
      viewCount: 0
    };

    if (getIsConnected()) {
      const created = await Story.create(newStoryPayload);
      return created;
    }

    // In-memory
    const id = 'story-' + Date.now().toString(36);
    const created = {
      _id: id,
      id,
      ...newStoryPayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryStories.unshift(created);
    return created;
  },

  // 4. Update story
  async updateStory(id, updateData) {
    if (updateData.content) {
      updateData.lines = parseLines(updateData.content);
      updateData.readTimeMinutes = calculateReadTime(updateData.content);
    }

    if (getIsConnected()) {
      const updated = await Story.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      return updated;
    }

    // In-memory
    const index = memoryStories.findIndex(s => s._id === id || s.id === id);
    if (index === -1) return null;

    memoryStories[index] = {
      ...memoryStories[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    return memoryStories[index];
  },

  // 5. Delete story
  async deleteStory(id) {
    if (getIsConnected()) {
      const deleted = await Story.findByIdAndDelete(id);
      return !!deleted;
    }

    // In-memory
    const index = memoryStories.findIndex(s => s._id === id || s.id === id);
    if (index === -1) return false;
    memoryStories.splice(index, 1);
    return true;
  },

  // 6. Increment view count
  async incrementView(idOrSlug) {
    if (getIsConnected()) {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
      const query = isMongoId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug };
      await Story.findOneAndUpdate(query, { $inc: { viewCount: 1 } });
      return;
    }

    const story = memoryStories.find(s => s._id === idOrSlug || s.id === idOrSlug || s.slug === idOrSlug);
    if (story) {
      story.viewCount = (story.viewCount || 0) + 1;
    }
  },

  // 7. Admin authentication
  async authenticateAdmin(username, password) {
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (getIsConnected()) {
      let user = await User.findOne({ username: username.toLowerCase() });
      if (!user && username.toLowerCase() === adminUsername) {
        // Seed default admin if user doesn't exist
        user = await User.create({
          username: adminUsername,
          password: adminPassword,
          role: 'admin'
        });
      }

      if (user && await user.comparePassword(password)) {
        return { id: user._id, username: user.username, role: user.role };
      }
      return null;
    }

    // Fallback store
    if (!memoryAdminUser) await initMemoryAdmin();
    if (username.toLowerCase() === memoryAdminUser.username) {
      const isValid = await bcrypt.compare(password, memoryAdminUser.passwordHash);
      if (isValid) {
        return { id: 'admin-fallback-id', username: memoryAdminUser.username, role: 'admin' };
      }
    }
    return null;
  }
};

module.exports = dataService;
