const mongoose = require('mongoose');

const audioFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalName: {
    type: String,
    default: 'soundtrack.mp3'
  },
  title: {
    type: String,
    default: 'Atmospheric Soundtrack'
  },
  contentType: {
    type: String,
    default: 'audio/mpeg'
  },
  size: {
    type: Number,
    default: 0
  },
  data: {
    type: Buffer,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AudioFile', audioFileSchema);
