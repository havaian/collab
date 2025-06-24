// src/file/model.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 255
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  size: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    default: 'file'
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  metadata: {
    encoding: {
      type: String,
      default: 'utf8'
    },
    lineEndings: {
      type: String,
      enum: ['LF', 'CRLF', 'CR'],
      default: 'LF'
    },
    readonly: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });
fileSchema.index({ projectId: 1, type: 1 });
fileSchema.index({ parentFolder: 1 });

// Virtual for file extension
fileSchema.virtual('extension').get(function() {
  if (this.type === 'folder') return null;
  const lastDot = this.name.lastIndexOf('.');
  return lastDot !== -1 ? this.name.substring(lastDot + 1) : '';
});

// Update size when content changes
fileSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.size = Buffer.byteLength(this.content, 'utf8');
    this.version += 1;
  }
  next();
});

// Method to get full file path
fileSchema.methods.getFullPath = async function() {
  if (!this.parentFolder) {
    return this.path;
  }
  
  const parent = await this.model('File').findById(this.parentFolder);
  if (parent) {
    const parentPath = await parent.getFullPath();
    return `${parentPath}/${this.name}`;
  }
  
  return this.path;
};

// Static method to detect language from file extension
fileSchema.statics.detectLanguage = function(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml'
  };
  
  return languageMap[ext] || 'plaintext';
};

module.exports = mongoose.model('File', fileSchema);