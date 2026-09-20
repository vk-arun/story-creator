const mongoose = require('mongoose');

const musicSegmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => 'seg_' + Math.random().toString(36).substring(2, 9)
  },
  title: {
    type: String,
    default: 'Atmospheric Track'
  },
  audioUrl: {
    type: String,
    required: true
  },
  fromLine: {
    type: Number,
    required: true,
    min: 1
  },
  toLine: {
    type: Number,
    required: true,
    min: 1
  },
  volume: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1
  },
  loop: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Story title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  summary: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80'
  },
  author: {
    type: String,
    default: 'Curator'
  },
  genre: {
    type: String,
    default: 'Fantasy',
    enum: ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Adventure', 'Horror', 'Poetry', 'Philosophy', 'Other']
  },
  content: {
    type: String,
    required: [true, 'Story content is required']
  },
  lines: {
    type: [String],
    default: []
  },
  musicSegments: {
    type: [musicSegmentSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  readTimeMinutes: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Story', storySchema);
