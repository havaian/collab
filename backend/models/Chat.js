const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'user';
    }
  },
  // AI-specific fields
  model: {
    type: String,
    required: function() {
      return this.type === 'assistant';
    }
  },
  tokens: {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  context: [{
    type: { type: String, enum: ['knowledge', 'file', 'message'] },
    id: mongoose.Schema.Types.ObjectId,
    title: String,
    reference: String
  }],
  // Thread support for organized conversations
  threadId: {
    type: String,
    default: null
  },
  // Message metadata
  isError: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reactions: [{
    emoji: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  messages: [chatMessageSchema],
  settings: {
    aiModel: {
      type: String,
      default: 'gpt-3.5-turbo',
      enum: [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-4',
        'gpt-4-32k',
        'gpt-4-turbo-preview'
      ]
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      default: 2000,
      min: 1,
      max: 8000
    },
    includeContext: {
      type: Boolean,
      default: true
    },
    systemPrompt: {
      type: String,
      maxlength: 2000
    }
  },
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  // Thread management
  threads: [{
    id: String,
    title: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    messageCount: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
chatSchema.index({ projectId: 1 });
chatSchema.index({ 'messages.createdAt': -1 });
chatSchema.index({ 'messages.threadId': 1 });
chatSchema.index({ 'messages.type': 1 });
chatSchema.index({ 'messages.author': 1 });

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Methods
chatSchema.methods.addMessage = function(messageData) {
  const message = {
    type: messageData.type,
    content: messageData.content,
    author: messageData.author,
    model: messageData.model,
    tokens: messageData.tokens,
    cost: messageData.cost,
    context: messageData.context,
    threadId: messageData.threadId,
    isError: messageData.isError
  };

  this.messages.push(message);
  
  // Update stats
  if (!this.stats) {
    this.stats = {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0
    };
  }
  
  this.stats.totalMessages += 1;
  this.stats.lastActivity = new Date();
  
  if (messageData.tokens) {
    this.stats.totalTokens += messageData.tokens.total || 0;
  }
  
  if (messageData.cost) {
    this.stats.totalCost += messageData.cost;
  }

  // Update thread message count
  if (messageData.threadId) {
    const thread = this.threads.find(t => t.id === messageData.threadId);
    if (thread) {
      thread.messageCount += 1;
    }
  }

  return this;
};

chatSchema.methods.createThread = function(title, createdBy) {
  const threadId = new mongoose.Types.ObjectId().toString();
  
  this.threads.push({
    id: threadId,
    title,
    createdBy,
    messageCount: 0
  });

  return threadId;
};

chatSchema.methods.getThread = function(threadId) {
  return this.threads.find(t => t.id === threadId);
};

chatSchema.methods.getThreadMessages = function(threadId) {
  return this.messages.filter(msg => msg.threadId === threadId);
};

chatSchema.methods.getRecentMessages = function(limit = 10, threadId = null) {
  let messages = this.messages;
  
  if (threadId) {
    messages = messages.filter(msg => msg.threadId === threadId);
  }
  
  return messages
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .reverse();
};

chatSchema.methods.getCostForPeriod = function(startDate, endDate) {
  return this.messages
    .filter(msg => 
      msg.type === 'assistant' && 
      msg.createdAt >= startDate && 
      msg.createdAt <= endDate
    )
    .reduce((total, msg) => total + (msg.cost || 0), 0);
};

chatSchema.methods.getTokensForPeriod = function(startDate, endDate) {
  return this.messages
    .filter(msg => 
      msg.type === 'assistant' && 
      msg.createdAt >= startDate && 
      msg.createdAt <= endDate
    )
    .reduce((total, msg) => total + (msg.tokens?.total || 0), 0);
};

// Static methods
chatSchema.statics.getProjectChat = async function(projectId) {
  let chat = await this.findOne({ projectId })
    .populate('messages.author', 'username avatar')
    .populate('threads.createdBy', 'username');

  if (!chat) {
    chat = new this({
      projectId,
      messages: [],
      settings: {
        aiModel: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000,
        includeContext: true
      },
      stats: {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0
      }
    });
    await chat.save();
  }

  return chat;
};

chatSchema.statics.getTotalCostForUser = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        'messages.author': new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $unwind: '$messages'
    },
    {
      $match: {
        'messages.author': new mongoose.Types.ObjectId(userId),
        'messages.type': 'user'
      }
    },
    {
      $group: {
        _id: null,
        totalCost: {
          $sum: {
            $ifNull: ['$messages.cost', 0]
          }
        }
      }
    }
  ]);

  return result.length > 0 ? result[0].totalCost : 0;
};

chatSchema.statics.getUsageStats = async function(projectId, startDate, endDate) {
  const chat = await this.findOne({ projectId });
  
  if (!chat) {
    return {
      totalMessages: 0,
      aiMessages: 0,
      totalTokens: 0,
      totalCost: 0
    };
  }

  const messages = chat.messages.filter(msg => 
    msg.createdAt >= startDate && msg.createdAt <= endDate
  );

  const aiMessages = messages.filter(msg => msg.type === 'assistant');

  return {
    totalMessages: messages.length,
    aiMessages: aiMessages.length,
    totalTokens: aiMessages.reduce((sum, msg) => sum + (msg.tokens?.total || 0), 0),
    totalCost: aiMessages.reduce((sum, msg) => sum + (msg.cost || 0), 0)
  };
};

chatSchema.statics.createForProject = async function(projectId) {
  try {
    // Check if chat already exists for this project
    const existingChat = await this.findOne({ projectId });
    
    if (existingChat) {
      return existingChat;
    }
    
    // Create new chat for the project
    const newChat = new this({
      projectId,
      messages: [],
      settings: {
        aiModel: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000,
        includeContext: true
      },
      stats: {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        lastActivity: new Date()
      },
      threads: []
    });
    
    await newChat.save();
    return newChat;
  } catch (error) {
    console.error('Error creating chat for project:', error);
    throw error;
  }
};

// Pre-save middleware
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    // Update stats based on current messages
    const aiMessages = this.messages.filter(msg => msg.type === 'assistant');
    
    this.stats.totalMessages = this.messages.length;
    this.stats.totalTokens = aiMessages.reduce((sum, msg) => sum + (msg.tokens?.total || 0), 0);
    this.stats.totalCost = aiMessages.reduce((sum, msg) => sum + (msg.cost || 0), 0);
    this.stats.lastActivity = new Date();
  }
  
  next();
});

// Export model
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;