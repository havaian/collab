const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'collaborator', 'viewer'],
    default: 'viewer'
  },
  permissions: {
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canInvite: { type: Boolean, default: false },
    canExecuteCode: { type: Boolean, default: false },
    canAccessAI: { type: Boolean, default: true }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Owner and collaborators
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  collaborators: [collaboratorSchema],
  
  // Repository integration
  githubRepo: {
    url: { type: String, default: null },
    branch: { type: String, default: 'main' },
    lastSync: { type: Date, default: null },
    syncEnabled: { type: Boolean, default: false }
  },
  
  // Project settings
  settings: {
    aiModel: {
      type: String,
      enum: ['gpt-4', 'gpt-3.5-turbo'],
      default: 'gpt-3.5-turbo'
    },
    defaultTheme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    codeExecution: {
      enabled: { type: Boolean, default: true },
      allowedLanguages: [{
        type: String,
        enum: ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'kotlin', 'ruby', 'rust', 'typescript']
      }],
      timeout: { type: Number, default: 30 }, // seconds
      memoryLimit: { type: Number, default: 128 } // MB
    },
    collaboration: {
      allowGuestUsers: { type: Boolean, default: false },
      requireApprovalForJoin: { type: Boolean, default: true },
      maxCollaborators: { type: Number, default: 10 }
    }
  },
  
  // Project status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  stats: {
    totalFiles: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalExecutions: { type: Number, default: 0 },
    totalKnowledgeItems: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  
  // Project tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  
  // Template information (if created from template)
  template: {
    source: { type: String, default: null },
    version: { type: String, default: null }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'collaborators.user': 1 });
projectSchema.index({ isPublic: 1, status: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ 'stats.lastActivity': -1 });

// Virtual for total collaborator count
projectSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators.length + 1; // +1 for owner
});

// Virtual for active collaborators (active in last 30 days)
projectSchema.virtual('activeCollaborators').get(function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.collaborators.filter(collab => collab.lastActive > thirtyDaysAgo);
});

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Update stats.lastActivity when project is modified
  this.stats.lastActivity = new Date();
  next();
});

// Instance methods
projectSchema.methods.addCollaborator = function(userId, role = 'viewer') {
  // Check if user is already a collaborator
  const existingCollab = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (existingCollab) {
    throw new Error('User is already a collaborator');
  }
  
  // Set permissions based on role
  const permissions = {
    canEdit: role === 'collaborator' || role === 'owner',
    canDelete: role === 'owner',
    canInvite: role === 'collaborator' || role === 'owner',
    canExecuteCode: role === 'collaborator' || role === 'owner',
    canAccessAI: true
  };
  
  this.collaborators.push({
    user: userId,
    role,
    permissions
  });
  
  return this.save();
};

projectSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  return this.save();
};

projectSchema.methods.updateCollaboratorRole = function(userId, newRole) {
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (!collaborator) {
    throw new Error('Collaborator not found');
  }
  
  collaborator.role = newRole;
  
  // Update permissions based on new role
  collaborator.permissions = {
    canEdit: newRole === 'collaborator' || newRole === 'owner',
    canDelete: newRole === 'owner',
    canInvite: newRole === 'collaborator' || newRole === 'owner',
    canExecuteCode: newRole === 'collaborator' || newRole === 'owner',
    canAccessAI: true
  };
  
  return this.save();
};

projectSchema.methods.canUserAccess = function(userId, action = 'view') {
  // Owner has all permissions
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check if user is a collaborator
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (!collaborator) {
    return this.isPublic && action === 'view';
  }
  
  // Check specific permissions
  switch (action) {
    case 'view':
      return true;
    case 'edit':
      return collaborator.permissions.canEdit;
    case 'delete':
      return collaborator.permissions.canDelete;
    case 'invite':
      return collaborator.permissions.canInvite;
    case 'execute':
      return collaborator.permissions.canExecuteCode;
    case 'ai':
      return collaborator.permissions.canAccessAI;
    default:
      return false;
  }
};

projectSchema.methods.updateActivity = function(userId) {
  // Update project activity
  this.stats.lastActivity = new Date();
  
  // Update collaborator activity
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (collaborator) {
    collaborator.lastActive = new Date();
  }
  
  return this.save();
};

projectSchema.methods.incrementStat = function(statName, amount = 1) {
  if (this.stats[statName] !== undefined) {
    this.stats[statName] += amount;
    this.stats.lastActivity = new Date();
    return this.save();
  }
  throw new Error(`Invalid stat name: ${statName}`);
};

// Static methods
projectSchema.statics.findUserProjects = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ],
    status: 'active'
  }).populate('owner', 'username email avatar')
    .populate('collaborators.user', 'username email avatar')
    .sort({ 'stats.lastActivity': -1 });
};

projectSchema.statics.findPublicProjects = function(limit = 20, skip = 0) {
  return this.find({
    isPublic: true,
    status: 'active'
  }).populate('owner', 'username avatar')
    .sort({ 'stats.lastActivity': -1 })
    .limit(limit)
    .skip(skip);
};

projectSchema.statics.searchProjects = function(query, userId, isPublic = false) {
  const searchQuery = {
    $and: [
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      },
      { status: 'active' }
    ]
  };
  
  if (isPublic) {
    searchQuery.$and.push({ isPublic: true });
  } else {
    searchQuery.$and.push({
      $or: [
        { owner: userId },
        { 'collaborators.user': userId }
      ]
    });
  }
  
  return this.find(searchQuery)
    .populate('owner', 'username avatar')
    .sort({ 'stats.lastActivity': -1 });
};

module.exports = mongoose.model('Project', projectSchema);