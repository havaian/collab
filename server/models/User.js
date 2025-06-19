const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../services/encryptionService');

const userSchema = new mongoose.Schema({
  // OAuth identifiers
  githubId: {
    type: String,
    sparse: true,
    index: true
  },
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Basic profile information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_-]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  avatar: {
    type: String,
    default: null
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Password for local auth (optional if using OAuth)
  password: {
    type: String,
    minlength: 6
  },
  
  // Encrypted API keys
  apiKeys: {
    openai: {
      type: String,
      default: null
    }
  },
  
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    defaultAIModel: {
      type: String,
      enum: ['gpt-4', 'gpt-3.5-turbo'],
      default: 'gpt-3.5-turbo'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Usage tracking
  usage: {
    totalProjects: { type: Number, default: 0 },
    totalExecutions: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      // Don't return sensitive data
      delete ret.password;
      delete ret.apiKeys;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'usage.lastActive': -1 });

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Hash password if it's new or modified
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Encrypt API keys if they're new or modified
  if (this.isModified('apiKeys.openai') && this.apiKeys.openai) {
    this.apiKeys.openai = encrypt(this.apiKeys.openai);
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getDecryptedApiKey = function(service) {
  if (!this.apiKeys[service]) return null;
  try {
    return decrypt(this.apiKeys[service]);
  } catch (error) {
    console.error(`Failed to decrypt ${service} API key for user ${this._id}:`, error);
    return null;
  }
};

userSchema.methods.setApiKey = function(service, key) {
  if (key) {
    this.apiKeys[service] = encrypt(key);
  } else {
    this.apiKeys[service] = null;
  }
};

userSchema.methods.updateLastActive = function() {
  this.usage.lastActive = new Date();
  return this.save();
};

// Static methods
userSchema.statics.findByOAuth = function(provider, id) {
  const query = {};
  query[`${provider}Id`] = id;
  return this.findOne(query);
};

userSchema.statics.createFromOAuth = function(provider, profile) {
  const userData = {
    username: profile.username || profile.displayName?.replace(/\s+/g, '').toLowerCase(),
    email: profile.emails?.[0]?.value,
    displayName: profile.displayName,
    avatar: profile.photos?.[0]?.value,
    isVerified: true
  };
  
  userData[`${provider}Id`] = profile.id;
  
  return this.create(userData);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.displayName || this.username;
});

module.exports = mongoose.model('User', userSchema);