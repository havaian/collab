const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  type: {
    type: String,
    enum: ['user', 'assistant', 'system', 'error'],
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'user';
    }
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000
  },
  
  // AI-specific fields
  model: {
    type: String,
    enum: ['gpt-4', 'gpt-3.5-turbo'],
    required: function() {
      return this.type === 'assistant';
    }
  },
  tokens: {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Context and references
  context: [{
    type: {
      type: String,
      enum: ['file', 'knowledge', 'previous_message']
    },
    reference: {
      type: String, // File ID, Knowledge ID, or Message ID
      required: true
    },
    content: {
      type: String, // Snippet or relevant content
      maxlength: 2000
    }
  }],
  
  // Message metadata
  timestamp: {
    type: Date,
    default: Date.now
  },
  edited: {
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    originalContent: { type: String, default: null }
  },
  
  // Thread information
  threadId: {
    type: String,
    default: 'main'
  },
  replyTo: {
    type: String, // Message ID this is replying to
    default: null
  },
  
  // Reactions and interactions
  reactions: [{
    emoji: { type: String, required: true },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: { type: Number, default: 0 }
  }],
  
  // Message status
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'error'],
    default: 'sent'
  },
  error: {
    message: { type: String, default: null },
    code: { type: String, default: null },
    timestamp: { type: Date, default: null }
  }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  
  messages: [messageSchema],
  
  // Chat settings
  settings: {
    aiModel: {
      type: String,
      enum: ['gpt-4', 'gpt-3.5-turbo'],
      default: 'gpt-3.5-turbo'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      min: 1,
      max: 4000,
      default: 2000
    },
    includeContext: {
      files: { type: Boolean, default: true },
      knowledge: { type: Boolean, default: true },
      previousMessages: { type: Number, default: 10 } // Number of previous messages to include
    }
  },
  
  // Active threads
  threads: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    messageCount: { type: Number, default: 0 }
  }],
  
  // Usage statistics
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }, // In USD
    aiInteractions: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
chatSchema.index({ projectId: 1 });
chatSchema.index({ 'messages.timestamp': -1 });
chatSchema.index({ 'messages.type': 1 });
chatSchema.index({ 'messages.threadId': 1 });
chatSchema.index({ 'stats.lastActivity': -1 });

// Virtual for recent messages
chatSchema.virtual('recentMessages').get(function() {
  return this.messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50); // Last 50 messages
});

// Virtual for active threads
chatSchema.virtual('activeThreads').get(function() {
  return this.threads.filter(thread => thread.isActive);
});

// Pre-save middleware
chatSchema.pre('save', function(next) {
  // Update stats
  this.stats.totalMessages = this.messages.length;
  this.stats.totalTokens = this.messages.reduce((total, msg) => total + (msg.tokens?.total || 0), 0);
  this.stats.aiInteractions = this.messages.filter(msg => msg.type === 'assistant').length;
  this.stats.lastActivity = new Date();
  
  // Update thread message counts
  this.threads.forEach(thread => {
    thread.messageCount = this.messages.filter(msg => msg.threadId === thread.id).length;
  });
  
  next();
});

// Instance methods
chatSchema.methods.addMessage = function(messageData) {
  const message = {
    id: messageData.id || new mongoose.Types.ObjectId().toString(),
    type: messageData.type,
    content: messageData.content,
    author: messageData.author,
    threadId: messageData.threadId || 'main',
    timestamp: new Date(),
    ...messageData
  };
  
  this.messages.push(message);
  
  // Update thread info if it's a new thread
  if (messageData.threadId && messageData.threadId !== 'main') {
    const existingThread = this.threads.find(t => t.id === messageData.threadId);
    if (!existingThread && messageData.threadName) {
      this.threads.push({
        id: messageData.threadId,
        name: messageData.threadName,
        description: messageData.threadDescription || '',
        createdBy: messageData.author,
        createdAt: new Date(),
        isActive: true,
        messageCount: 0
      });
    }
  }
  
  return this.save();
};

chatSchema.methods.editMessage = function(messageId, newContent, userId) {
  const message = this.messages.find(msg => msg.id === messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Only the author can edit their message
  if (message.author.toString() !== userId.toString()) {
    throw new Error('Cannot edit message from another user');
  }
  
  // Store original content if not already edited
  if (!message.edited.isEdited) {
    message.edited.originalContent = message.content;
  }
  
  message.content = newContent;
  message.edited.isEdited = true;
  message.edited.editedAt = new Date();
  
  return this.save();
};

chatSchema.methods.deleteMessage = function(messageId, userId) {
  const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
  
  if (messageIndex === -1) {
    throw new Error('Message not found');
  }
  
  const message = this.messages[messageIndex];
  
  // Only the author can delete their message
  if (message.author.toString() !== userId.toString()) {
    throw new Error('Cannot delete message from another user');
  }
  
  this.messages.splice(messageIndex, 1);
  return this.save();
};

chatSchema.methods.addReaction = function(messageId, emoji, userId) {
  const message = this.messages.find(msg => msg.id === messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  let reaction = message.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    // Toggle reaction
    const userIndex = reaction.users.findIndex(uid => uid.toString() === userId.toString());
    if (userIndex > -1) {
      reaction.users.splice(userIndex, 1);
      reaction.count = Math.max(0, reaction.count - 1);
      
      // Remove reaction if no users
      if (reaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      reaction.users.push(userId);
      reaction.count += 1;
    }
  } else {
    // Add new reaction
    message.reactions.push({
      emoji,
      users: [userId],
      count: 1
    });
  }
  
  return this.save();
};

chatSchema.methods.getMessages = function(threadId = null, limit = 50, skip = 0) {
  let messages = this.messages;
  
  if (threadId) {
    messages = messages.filter(msg => msg.threadId === threadId);
  }
  
  return messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(skip, skip + limit)
    .reverse(); // Return in chronological order
};

chatSchema.methods.getMessageContext = function(messageId, contextLength = 5) {
  const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
  
  if (messageIndex === -1) {
    throw new Error('Message not found');
  }
  
  const startIndex = Math.max(0, messageIndex - contextLength);
  const endIndex = Math.min(this.messages.length, messageIndex + contextLength + 1);
  
  return this.messages.slice(startIndex, endIndex);
};

chatSchema.methods.createThread = function(threadName, description, createdBy) {
  const threadId = new mongoose.Types.ObjectId().toString();
  
  this.threads.push({
    id: threadId,
    name: threadName,
    description: description || '',
    createdBy,
    createdAt: new Date(),
    isActive: true,
    messageCount: 0
  });
  
  return this.save().then(() => threadId);
};

chatSchema.methods.archiveThread = function(threadId) {
  const thread = this.threads.find(t => t.id === threadId);
  
  if (!thread) {
    throw new Error('Thread not found');
  }
  
  thread.isActive = false;
  return this.save();
};

chatSchema.methods.getTokenUsage = function(timeframe = 'month') {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0); // All time
  }
  
  const recentMessages = this.messages.filter(msg => 
    msg.timestamp >= startDate && msg.type === 'assistant'
  );
  
  return recentMessages.reduce((total, msg) => total + (msg.tokens?.total || 0), 0);
};

chatSchema.methods.estimateCost = function(tokens, model = 'gpt-3.5-turbo') {
  // Pricing per 1K tokens (as of 2024)
  const pricing = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };
  
  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
  
  // Simplified cost calculation (in production, track input vs output tokens separately)
  const cost = (tokens / 1000) * ((modelPricing.input + modelPricing.output) / 2);
  
  return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
};

// Static methods
chatSchema.statics.findByProject = function(projectId) {
  return this.findOne({ projectId })
    .populate('messages.author', 'username avatar')
    .populate('threads.createdBy', 'username avatar');
};

chatSchema.statics.createForProject = function(projectId, settings = {}) {
  const defaultSettings = {
    aiModel: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    includeContext: {
      files: true,
      knowledge: true,
      previousMessages: 10
    }
  };
  
  const chat = new this({
    projectId,
    settings: { ...defaultSettings, ...settings },
    threads: [{
      id: 'main',
      name: 'General Discussion',
      description: 'Main project discussion thread',
      createdBy: null, // System created
      createdAt: new Date(),
      isActive: true,
      messageCount: 0
    }]
  });
  
  return chat.save();
};

chatSchema.statics.getRecentActivity = function(projectIds, limit = 20) {
  return this.find({ 
    projectId: { $in: projectIds },
    'messages.0': { $exists: true } // Has at least one message
  })
  .populate('projectId', 'name')
  .populate('messages.author', 'username avatar')
  .sort({ 'stats.lastActivity': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Chat', chatSchema);