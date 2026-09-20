const bcrypt = require('bcryptjs');
const Story = require('../models/Story');
const User = require('../models/User');
const { connectDB, getIsConnected } = require('../config/db');
const { initialSeedStories } = require('../utils/seedData');

const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/uploads/')
  );
};

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
  // Helper to guarantee connection on serverless calls
  async ensureConnection() {
    if (process.env.MONGODB_URI) {
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        await connectDB();
      }
    }
  },

  // 1. Get stories with optional filters
  async getStories({ status, genre, search, isAdmin = false }) {
    if (process.env.MONGODB_URI) {
      try {
        await this.ensureConnection();
      } catch (err) {
        console.warn('getStories DB connect warning:', err.message);
      }
    }

    if (getIsConnected() || process.env.MONGODB_URI) {
      const query = {};
      if (!isAdmin) {
        query.status = 'published';
      } else if (status && status !== 'all') {
        query.status = status;
      }
      if (genre && genre !== 'All') {
        query.genre = genre;
      }
      if (search && search.trim()) {
        const s = search.trim();
        query.$or = [
          { title: { $regex: s, $options: 'i' } },
          { summary: { $regex: s, $options: 'i' } }
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
    if (process.env.MONGODB_URI) {
      try {
        await this.ensureConnection();
      } catch (err) {
        console.warn('getStory DB connect warning:', err.message);
      }
    }

    if (getIsConnected() || process.env.MONGODB_URI) {
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
    if (process.env.MONGODB_URI) {
      await this.ensureConnection();
    }

    const lines = parseLines(storyData.content || '');
    const readTimeMinutes = calculateReadTime(storyData.content || '');
    const slug = generateSlug(storyData.title);

    const newStoryPayload = {
      title: storyData.title,
      slug,
      summary: storyData.summary || '',
      coverImage: (storyData.coverImage && isValidImageUrl(storyData.coverImage))
        ? storyData.coverImage.trim()
        : 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80',
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

    if (process.env.MONGODB_URI) {
      throw new Error('Database is not connected. Story could not be saved to MongoDB Atlas.');
    }

    // In-memory fallback (only when MONGODB_URI is intentionally not provided)
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
    if (process.env.MONGODB_URI) {
      await this.ensureConnection();
    }

    if (updateData.content) {
      updateData.lines = parseLines(updateData.content);
      updateData.readTimeMinutes = calculateReadTime(updateData.content);
    }

    if (updateData.coverImage !== undefined) {
      updateData.coverImage = isValidImageUrl(updateData.coverImage)
        ? updateData.coverImage.trim()
        : 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80';
    }

    if (getIsConnected()) {
      const updated = await Story.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      return updated;
    }

    if (process.env.MONGODB_URI) {
      throw new Error('Database is not connected. Story could not be updated in MongoDB Atlas.');
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
    if (process.env.MONGODB_URI) {
      await this.ensureConnection();
    }

    if (getIsConnected()) {
      const deleted = await Story.findByIdAndDelete(id);
      return !!deleted;
    }

    if (process.env.MONGODB_URI) {
      throw new Error('Database is not connected. Story could not be deleted from MongoDB Atlas.');
    }

    // In-memory
    const index = memoryStories.findIndex(s => s._id === id || s.id === id);
    if (index === -1) return false;
    memoryStories.splice(index, 1);
    return true;
  },

  // 6. Increment view count
  async incrementView(idOrSlug) {
    await this.ensureConnection().catch(() => {});

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
    await this.ensureConnection().catch(err => console.warn('authenticateAdmin DB connect warning:', err.message));

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

