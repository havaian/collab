const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 100000 // 100KB limit per knowledge item
  },
  type: {
    type: String,
    enum: ['document', 'code-snippet', 'note', 'reference', 'api-doc', 'tutorial'],
    default: 'note'
  },
  
  // Content metadata
  format: {
    type: String,
    enum: ['markdown', 'text', 'code', 'json', 'yaml'],
    default: 'markdown'
  },
  language: {
    type: String, // Programming language for code snippets
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'kotlin', 'ruby', 'php', 'html', 'css', 'sql', 'shell'
    ],
    default: null
  },
  
  // Organization
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  category: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'General'
  },
  
  // Search and AI features
  embedding: {
    type: [Number], // Vector embedding for similarity search
    default: null,
    validate: {
      validator: function(arr) {
        return !arr || arr.length === 1536; // OpenAI embedding dimension
      },
      message: 'Embedding must be 1536 dimensions'
    }
  },
  keywords: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Usage tracking
  usage: {
    viewCount: { type: Number, default: 0 },
    lastViewed: { type: Date, default: null },
    usedInAI: { type: Number, default: 0 }, // Times referenced in AI context
    lastUsedInAI: { type: Date, default: null }
  },
  
  // Authoring information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  history: [{
    version: { type: Number, required: true },
    content: { type: String, required: true },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    modifiedAt: { type: Date, default: Date.now },
    changes: { type: String, default: null } // Summary of changes
  }],
  
  // Content relationships
  references: [{
    type: {
      type: String,
      enum: ['file', 'knowledge', 'url', 'message']
    },
    id: { type: String, required: true }, // File ID, Knowledge ID, URL, or Message ID
    title: { type: String, default: '' },
    description: { type: String, default: '' }
  }],
  
  // Status and permissions
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: false // Whether visible to all project members
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // AI context settings
  includeInContext: {
    type: Boolean,
    default: true
  },
  contextPriority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5 // Higher priority items are more likely to be included in AI context
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
knowledgeSchema.index({ projectId: 1, status: 1 });
knowledgeSchema.index({ projectId: 1, type: 1 });
knowledgeSchema.index({ projectId: 1, category: 1 });
knowledgeSchema.index({ tags: 1 });
knowledgeSchema.index({ keywords: 1 });
knowledgeSchema.index({ 'usage.lastViewed': -1 });
knowledgeSchema.index({ isPinned: -1, updatedAt: -1 });

// Text index for search
knowledgeSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
  keywords: 'text'
});

// Virtual for content preview
knowledgeSchema.virtual('preview').get(function() {
  return this.content.length > 200 
    ? this.content.substring(0, 200) + '...'
    : this.content;
});

// Virtual for word count
knowledgeSchema.virtual('wordCount').get(function() {
  return this.content.split(/\s+/).filter(word => word.length > 0).length;
});

// Virtual for reading time estimate
knowledgeSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const words = this.wordCount;
  return Math.ceil(words / wordsPerMinute);
});

// Pre-save middleware
knowledgeSchema.pre('save', function(next) {
  // Auto-generate keywords from title and content
  if (this.isModified('title') || this.isModified('content')) {
    this.generateKeywords();
  }
  
  // Update version and history on content changes
  if (this.isModified('content') && !this.isNew) {
    this.addToHistory();
  }
  
  next();
});

// Instance methods
knowledgeSchema.methods.generateKeywords = function() {
  const text = `${this.title} ${this.content}`.toLowerCase();
  
  // Simple keyword extraction (in production, use NLP library)
  const words = text.match(/\b\w{3,}\b/g) || [];
  const wordFreq = {};
  
  words.forEach(word => {
    // Skip common words
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'use', 'way', 'she', 'may', 'say'];
    if (!stopWords.includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // Get top keywords
  this.keywords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
};

knowledgeSchema.methods.addToHistory = function() {
  const historyEntry = {
    version: this.version,
    content: this.content,
    modifiedBy: this.lastModifiedBy || this.createdBy,
    modifiedAt: new Date(),
    changes: `Version ${this.version + 1} update`
  };
  
  // Add to history and keep only last 20 versions
  this.history.unshift(historyEntry);
  if (this.history.length > 20) {
    this.history = this.history.slice(0, 20);
  }
  
  this.version += 1;
};

knowledgeSchema.methods.incrementView = function() {
  this.usage.viewCount += 1;
  this.usage.lastViewed = new Date();
  return this.save();
};

knowledgeSchema.methods.markUsedInAI = function() {
  this.usage.usedInAI += 1;
  this.usage.lastUsedInAI = new Date();
  return this.save();
};

knowledgeSchema.methods.addReference = function(type, id, title = '', description = '') {
  // Check if reference already exists
  const existingRef = this.references.find(ref => ref.type === type && ref.id === id);
  if (existingRef) {
    return this;
  }
  
  this.references.push({
    type,
    id,
    title,
    description
  });
  
  return this.save();
};

knowledgeSchema.methods.removeReference = function(type, id) {
  this.references = this.references.filter(ref => !(ref.type === type && ref.id === id));
  return this.save();
};

knowledgeSchema.methods.getSimilarItems = function(limit = 5) {
  if (!this.embedding) {
    return Promise.resolve([]);
  }
  
  // In production, use proper vector similarity search
  // This is a simplified version
  return this.constructor.find({
    projectId: this.projectId,
    _id: { $ne: this._id },
    embedding: { $exists: true },
    status: 'published'
  }).limit(limit);
};

knowledgeSchema.methods.clone = function(newTitle, userId) {
  const clonedData = {
    projectId: this.projectId,
    title: newTitle || `${this.title} (Copy)`,
    content: this.content,
    type: this.type,
    format: this.format,
    language: this.language,
    tags: [...this.tags],
    category: this.category,
    keywords: [...this.keywords],
    createdBy: userId,
    status: 'draft'
  };
  
  return new this.constructor(clonedData).save();
};

// Static methods
knowledgeSchema.statics.findByProject = function(projectId, filters = {}) {
  const query = { projectId, ...filters };
  
  return this.find(query)
    .populate('createdBy', 'username avatar')
    .populate('lastModifiedBy', 'username avatar')
    .sort({ isPinned: -1, updatedAt: -1 });
};

knowledgeSchema.statics.searchKnowledge = function(projectId, searchTerm, options = {}) {
  const {
    type = null,
    category = null,
    tags = [],
    limit = 20,
    skip = 0
  } = options;
  
  const query = {
    projectId,
    status: 'published',
    $text: { $search: searchTerm }
  };
  
  if (type) query.type = type;
  if (category) query.category = category;
  if (tags.length > 0) query.tags = { $in: tags };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('createdBy', 'username avatar')
    .sort({ score: { $meta: 'textScore' }, isPinned: -1 })
    .limit(limit)
    .skip(skip);
};

knowledgeSchema.statics.getByCategory = function(projectId) {
  return this.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId), status: 'published' } },
    { $group: {
      _id: '$category',
      count: { $sum: 1 },
      items: { $push: {
        _id: '$_id',
        title: '$title',
        type: '$type',
        updatedAt: '$updatedAt',
        isPinned: '$isPinned'
      }}
    }},
    { $sort: { '_id': 1 } }
  ]);
};

knowledgeSchema.statics.getTopTags = function(projectId, limit = 20) {
  return this.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId), status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

knowledgeSchema.statics.getRecentActivity = function(projectId, limit = 10) {
  return this.find({
    projectId,
    status: { $in: ['published', 'draft'] }
  })
  .populate('createdBy', 'username avatar')
  .populate('lastModifiedBy', 'username avatar')
  .sort({ updatedAt: -1 })
  .limit(limit);
};

knowledgeSchema.statics.findForAIContext = function(projectId, query = '', limit = 5) {
  const searchQuery = {
    projectId,
    status: 'published',
    includeInContext: true
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  return this.find(searchQuery, query ? { score: { $meta: 'textScore' } } : {})
    .sort(query ? { score: { $meta: 'textScore' }, contextPriority: -1 } : { contextPriority: -1, 'usage.usedInAI': -1 })
    .limit(limit)
    .select('title content type contextPriority');
};

module.exports = mongoose.model('KnowledgeBase', knowledgeSchema);