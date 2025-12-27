const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#6366f1' // Default purple color
  }
}, { _id: false });

const diarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for faster queries
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  labels: {
    type: [labelSchema],
    default: []
  },
  backgroundColor: {
    type: String,
    default: '#ffffff' // Default white background
  }
}, {
  timestamps: true
});

// Index for text search on title and content
diarySchema.index({ title: 'text', content: 'text' });

// Index for owner and createdAt for efficient queries
diarySchema.index({ owner: 1, createdAt: -1 });

// Index for owner, isPinned for sorting (pinned first)
diarySchema.index({ owner: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Diary', diarySchema);

