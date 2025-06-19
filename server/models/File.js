const mongoose = require('mongoose');
const path = require('path');

const fileHistorySchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  },
  changes: {
    type: String, // JSON string of diff
    default: null
  },
  message: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, { _id: false });

const fileSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  path: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['code', 'text', 'markdown', 'json', 'config'],
    required: true
  },
  content: {
    type: String,
    default: '',
    maxlength: 1000000 // 1MB text limit
  },
  language: {
    type: String,
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'kotlin', 'ruby', 'php', 'html', 'css', 'scss',
      'json', 'xml', 'yaml', 'markdown', 'txt', 'sql', 'shell'
    ],
    default: 'txt'
  },
  
  // File metadata
  size: {
    type: Number,
    default: 0
  },
  encoding: {
    type: String,
    default: 'utf-8'
  },
  mimeType: {
    type: String,
    default: 'text/plain'
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // File history (keep last 50 versions)
  history: {
    type: [fileHistorySchema],
    default: [],
    validate: {
      validator: function(history) {
        return history.length <= 50;
      },
      message: 'File history cannot exceed 50 versions'
    }
  },
  
  // File permissions
  permissions: {
    isReadOnly: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockExpires: {
      type: Date,
      default: null
    }
  },
  
  // Collaboration metadata
  activeEditors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    cursor: {
      line: { type: Number, default: 0 },
      character: { type: Number, default: 0 }
    },
    selection: {
      start: {
        line: { type: Number, default: 0 },
        character: { type: Number, default: 0 }
      },
      end: {
        line: { type: Number, default: 0 },
        character: { type: Number, default: 0 }
      }
    }
  }],
  
  // File statistics
  stats: {
    totalEdits: { type: Number, default: 0 },
    totalExecutions: { type: Number, default: 0 },
    lastExecution: { type: Date, default: null },
    averageEditTime: { type: Number, default: 0 } // in seconds
  },
  
  // AI context - whether this file should be included in AI context
  includeInAIContext: {
    type: Boolean,
    default: true
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });
fileSchema.index({ projectId: 1, type: 1 });
fileSchema.index({ projectId: 1, language: 1 });
fileSchema.index({ lastModified: -1 });
fileSchema.index({ 'activeEditors.user': 1 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  return path.extname(this.name).toLowerCase();
});

// Virtual for full file path
fileSchema.virtual('fullPath').get(function() {
  return path.join(this.path, this.name);
});

// Virtual for file size in human readable format
fileSchema.virtual('humanSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Pre-save middleware
fileSchema.pre('save', function(next) {
  // Update file size based on content
  this.size = Buffer.byteLength(this.content, 'utf8');
  
  // Auto-detect language from file extension if not set
  if (!this.language || this.language === 'txt') {
    this.language = this.detectLanguageFromExtension();
  }
  
  // Set file type based on language
  this.type = this.getTypeFromLanguage();
  
  // Set MIME type
  this.mimeType = this.getMimeType();
  
  // Clean up expired locks
  if (this.permissions.lockExpires && this.permissions.lockExpires < new Date()) {
    this.permissions.isLocked = false;
    this.permissions.lockedBy = null;
    this.permissions.lockExpires = null;
  }
  
  // Clean up inactive editors (remove if not seen in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  this.activeEditors = this.activeEditors.filter(editor => editor.lastSeen > fiveMinutesAgo);
  
  next();
});

// Instance methods
fileSchema.methods.detectLanguageFromExtension = function() {
  const ext = this.extension;
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.cxx': 'cpp',
    '.cc': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.kt': 'kotlin',
    '.rb': 'ruby',
    '.php': 'php',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'scss',
    '.json': 'json',
    '.xml': 'xml',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.md': 'markdown',
    '.markdown': 'markdown',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell'
  };
  
  return languageMap[ext] || 'txt';
};

fileSchema.methods.getTypeFromLanguage = function() {
  const codeLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
    'go', 'rust', 'kotlin', 'ruby', 'php', 'sql', 'shell'
  ];
  
  if (codeLanguages.includes(this.language)) return 'code';
  if (this.language === 'markdown') return 'markdown';
  if (this.language === 'json' || this.language === 'xml' || this.language === 'yaml') return 'config';
  return 'text';
};

fileSchema.methods.getMimeType = function() {
  const mimeMap = {
    'javascript': 'text/javascript',
    'typescript': 'text/typescript',
    'python': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'csharp': 'text/x-csharp',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
    'markdown': 'text/markdown'
  };
  
  return mimeMap[this.language] || 'text/plain';
};

fileSchema.methods.addToHistory = function(content, userId, message = null) {
  // Calculate diff (simplified - in production, use a proper diff library)
  const changes = JSON.stringify({
    added: content.length - this.content.length,
    timestamp: new Date()
  });
  
  const historyEntry = {
    version: this.version,
    content: this.content, // Store previous content
    modifiedBy: userId,
    modifiedAt: new Date(),
    changes,
    message
  };
  
  // Add to history and keep only last 50 versions
  this.history.unshift(historyEntry);
  if (this.history.length > 50) {
    this.history = this.history.slice(0, 50);
  }
  
  // Update current version
  this.version += 1;
  this.content = content;
  this.lastModified = new Date();
  this.lastModifiedBy = userId;
  this.stats.totalEdits += 1;
  
  return this.save();
};

fileSchema.methods.lockFile = function(userId, duration = 10) {
  if (this.permissions.isLocked && this.permissions.lockedBy.toString() !== userId.toString()) {
    throw new Error('File is already locked by another user');
  }
  
  this.permissions.isLocked = true;
  this.permissions.lockedBy = userId;
  this.permissions.lockExpires = new Date(Date.now() + duration * 60 * 1000); // duration in minutes
  
  return this.save();
};

fileSchema.methods.unlockFile = function(userId) {
  if (this.permissions.isLocked && this.permissions.lockedBy.toString() !== userId.toString()) {
    throw new Error('Cannot unlock file locked by another user');
  }
  
  this.permissions.isLocked = false;
  this.permissions.lockedBy = null;
  this.permissions.lockExpires = null;
  
  return this.save();
};

fileSchema.methods.updateEditorPresence = function(userId, cursor, selection) {
  let editor = this.activeEditors.find(e => e.user.toString() === userId.toString());
  
  if (editor) {
    editor.lastSeen = new Date();
    editor.cursor = cursor;
    editor.selection = selection;
  } else {
    this.activeEditors.push({
      user: userId,
      lastSeen: new Date(),
      cursor,
      selection
    });
  }
  
  return this.save();
};

fileSchema.methods.removeEditor = function(userId) {
  this.activeEditors = this.activeEditors.filter(
    editor => editor.user.toString() !== userId.toString()
  );
  return this.save();
};

fileSchema.methods.canEdit = function(userId, projectPermissions) {
  // Check if file is read-only
  if (this.permissions.isReadOnly) return false;
  
  // Check if file is locked by someone else
  if (this.permissions.isLocked && 
      this.permissions.lockedBy.toString() !== userId.toString()) {
    return false;
  }
  
  // Check project-level permissions
  return projectPermissions.canEdit;
};

// Static methods
fileSchema.statics.findByProject = function(projectId, type = null) {
  const query = { projectId };
  if (type) query.type = type;
  
  return this.find(query)
    .populate('lastModifiedBy', 'username avatar')
    .sort({ lastModified: -1 });
};

fileSchema.statics.searchFiles = function(projectId, searchTerm) {
  return this.find({
    projectId,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).populate('lastModifiedBy', 'username avatar')
    .sort({ lastModified: -1 });
};

fileSchema.statics.getRecentFiles = function(projectId, limit = 10) {
  return this.find({ projectId })
    .populate('lastModifiedBy', 'username avatar')
    .sort({ lastModified: -1 })
    .limit(limit);
};

module.exports = mongoose.model('File', fileSchema);