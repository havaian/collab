// src/export/model.js
const mongoose = require('mongoose');

const exportSchema = new mongoose.Schema({
  exportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['zip', 'file', 'gist', 'github'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  options: {
    includeDeleted: {
      type: Boolean,
      default: false
    },
    fileIds: [String], // Specific files to export
    format: {
      type: String,
      enum: ['zip', 'tar', 'tar.gz'],
      default: 'zip'
    },
    gistSettings: {
      isPublic: {
        type: Boolean,
        default: false
      },
      description: String
    }
  },
  result: {
    downloadUrl: String,
    gistUrl: String,
    fileSize: Number,
    fileCount: Number,
    expiresAt: Date
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for cleanup of expired exports
exportSchema.index({ 'result.expiresAt': 1 }, { expireAfterSeconds: 0 });
exportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Export', exportSchema);