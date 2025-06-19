const mongoose = require('mongoose');

const executionResultSchema = new mongoose.Schema({
  // Reference information
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Code execution details
  code: {
    type: String,
    required: true,
    maxlength: 100000 // 100KB code limit
  },
  language: {
    type: String,
    required: true,
    enum: [
      'javascript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'kotlin', 'ruby', 'rust', 'typescript', 'php'
    ]
  },
  languageId: {
    type: Number,
    required: true // Judge0 language ID
  },
  
  // Input/Output
  stdin: {
    type: String,
    default: '',
    maxlength: 10000
  },
  stdout: {
    type: String,
    default: null,
    maxlength: 100000
  },
  stderr: {
    type: String,
    default: null,
    maxlength: 100000
  },
  
  // Execution status
  status: {
    id: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] // Judge0 status IDs
    },
    description: {
      type: String,
      required: true,
      enum: [
        'In Queue', 'Processing', 'Accepted', 'Wrong Answer',
        'Time Limit Exceeded', 'Compilation Error', 'Runtime Error (SIGSEGV)',
        'Runtime Error (SIGXFSZ)', 'Runtime Error (SIGFPE)', 'Runtime Error (SIGABRT)',
        'Runtime Error (NZEC)', 'Runtime Error (Other)', 'Internal Error', 'Exec Format Error'
      ]
    }
  },
  
  // Performance metrics
  time: {
    type: String, // Execution time (e.g., "0.123")
    default: null
  },
  memory: {
    type: Number, // Memory usage in KB
    default: null
  },
  
  // Judge0 specific
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Execution metadata
  executedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  // Additional context
  executionContext: {
    filename: { type: String, default: '' },
    codeVersion: { type: Number, default: 1 },
    environment: { type: String, default: 'judge0' },
    timeout: { type: Number, default: 30 }, // seconds
    memoryLimit: { type: Number, default: 128 } // MB
  },
  
  // Error handling
  error: {
    hasError: { type: Boolean, default: false },
    errorType: {
      type: String,
      enum: ['compilation', 'runtime', 'timeout', 'memory', 'system', 'network'],
      default: null
    },
    errorMessage: { type: String, default: null },
    stackTrace: { type: String, default: null }
  },
  
  // Collaboration features
  isShared: {
    type: Boolean,
    default: true // Whether result is visible to other project members
  },
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  
  // Usage tracking
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
executionResultSchema.index({ projectId: 1, userId: 1 });
executionResultSchema.index({ fileId: 1, executedAt: -1 });
executionResultSchema.index({ userId: 1, executedAt: -1 });
executionResultSchema.index({ 'status.id': 1 });
executionResultSchema.index({ token: 1 }, { unique: true });

// Virtual for success status
executionResultSchema.virtual('isSuccess').get(function() {
  return this.status.id === 3; // Accepted
});

// Virtual for has output
executionResultSchema.virtual('hasOutput').get(function() {
  return !!(this.stdout || this.stderr);
});

// Virtual for execution duration
executionResultSchema.virtual('duration').get(function() {
  if (!this.completedAt) return null;
  return this.completedAt.getTime() - this.executedAt.getTime();
});

// Virtual for human-readable time
executionResultSchema.virtual('humanTime').get(function() {
  if (!this.time) return 'N/A';
  const timeFloat = parseFloat(this.time);
  if (timeFloat < 1) {
    return `${Math.round(timeFloat * 1000)}ms`;
  }
  return `${timeFloat}s`;
});

// Virtual for human-readable memory
executionResultSchema.virtual('humanMemory').get(function() {
  if (!this.memory) return 'N/A';
  if (this.memory < 1024) {
    return `${this.memory} KB`;
  }
  return `${(this.memory / 1024).toFixed(2)} MB`;
});

// Pre-save middleware
executionResultSchema.pre('save', function(next) {
  // Set completion time when status changes from processing
  if (this.isModified('status.id') && this.status.id > 2 && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Set error flag based on status
  if (this.status.id >= 4) { // Any status >= 4 is an error
    this.error.hasError = true;
    
    // Categorize error type
    switch (this.status.id) {
      case 6:
        this.error.errorType = 'compilation';
        break;
      case 5:
        this.error.errorType = 'timeout';
        break;
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
        this.error.errorType = 'runtime';
        break;
      case 13:
      case 14:
        this.error.errorType = 'system';
        break;
    }
    
    this.error.errorMessage = this.status.description;
  }
  
  next();
});

// Instance methods
executionResultSchema.methods.updateStatus = function(statusData) {
  this.status = {
    id: statusData.status?.id || statusData.status_id,
    description: this.getStatusDescription(statusData.status?.id || statusData.status_id)
  };
  
  if (statusData.stdout) {
    this.stdout = Buffer.from(statusData.stdout, 'base64').toString('utf-8');
  }
  
  if (statusData.stderr) {
    this.stderr = Buffer.from(statusData.stderr, 'base64').toString('utf-8');
  }
  
  this.time = statusData.time;
  this.memory = statusData.memory;
  
  return this.save();
};

executionResultSchema.methods.getStatusDescription = function(statusId) {
  const statusMap = {
    1: 'In Queue',
    2: 'Processing',
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error (SIGSEGV)',
    8: 'Runtime Error (SIGXFSZ)',
    9: 'Runtime Error (SIGFPE)',
    10: 'Runtime Error (SIGABRT)',
    11: 'Runtime Error (NZEC)',
    12: 'Runtime Error (Other)',
    13: 'Internal Error',
    14: 'Exec Format Error'
  };
  
  return statusMap[statusId] || 'Unknown Status';
};

executionResultSchema.methods.getColorCode = function() {
  switch (this.status.id) {
    case 1:
    case 2:
      return 'yellow'; // Processing
    case 3:
      return 'green'; // Success
    case 5:
      return 'orange'; // Timeout
    case 6:
      return 'purple'; // Compilation error
    default:
      return 'red'; // Runtime/other errors
  }
};

executionResultSchema.methods.getOutput = function() {
  if (this.stdout && this.stderr) {
    return `STDOUT:\n${this.stdout}\n\nSTDERR:\n${this.stderr}`;
  }
  return this.stdout || this.stderr || 'No output';
};

executionResultSchema.methods.incrementView = function() {
  this.viewCount += 1;
  this.lastViewed = new Date();
  return this.save();
};

executionResultSchema.methods.canView = function(userId, projectPermissions) {
  // Owner can always view
  if (this.userId.toString() === userId.toString()) {
    return true;
  }
  
  // Check if shared and user has project access
  return this.isShared && projectPermissions.canView;
};

// Static methods
executionResultSchema.statics.findByProject = function(projectId, filters = {}) {
  const query = { projectId, ...filters };
  
  return this.find(query)
    .populate('userId', 'username avatar')
    .populate('fileId', 'name path')
    .sort({ executedAt: -1 });
};

executionResultSchema.statics.findByUser = function(userId, limit = 20) {
  return this.find({ userId })
    .populate('projectId', 'name')
    .populate('fileId', 'name path')
    .sort({ executedAt: -1 })
    .limit(limit);
};

executionResultSchema.statics.findByFile = function(fileId, limit = 10) {
  return this.find({ fileId })
    .populate('userId', 'username avatar')
    .sort({ executedAt: -1 })
    .limit(limit);
};

executionResultSchema.statics.getExecutionStats = function(projectId, timeframe = 'week') {
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
  
  return this.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(projectId),
        executedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        successfulExecutions: {
          $sum: { $cond: [{ $eq: ['$status.id', 3] }, 1, 0] }
        },
        failedExecutions: {
          $sum: { $cond: [{ $ne: ['$status.id', 3] }, 1, 0] }
        },
        avgExecutionTime: { $avg: { $toDouble: '$time' } },
        avgMemoryUsage: { $avg: '$memory' },
        languageBreakdown: {
          $push: '$language'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalExecutions: 1,
        successfulExecutions: 1,
        failedExecutions: 1,
        successRate: {
          $multiply: [
            { $divide: ['$successfulExecutions', '$totalExecutions'] },
            100
          ]
        },
        avgExecutionTime: { $round: ['$avgExecutionTime', 3] },
        avgMemoryUsage: { $round: ['$avgMemoryUsage', 2] }
      }
    }
  ]);
};

executionResultSchema.statics.getLanguageStats = function(projectId, timeframe = 'month') {
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
      startDate = new Date(0);
  }
  
  return this.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(projectId),
        executedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$language',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status.id', 3] }, 1, 0] }
        },
        avgTime: { $avg: { $toDouble: '$time' } },
        avgMemory: { $avg: '$memory' }
      }
    },
    {
      $project: {
        language: '$_id',
        count: 1,
        successCount: 1,
        successRate: {
          $multiply: [
            { $divide: ['$successCount', '$count'] },
            100
          ]
        },
        avgTime: { $round: ['$avgTime', 3] },
        avgMemory: { $round: ['$avgMemory', 2] }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

executionResultSchema.statics.getRecentExecutions = function(projectId, limit = 20) {
  return this.find({ projectId })
    .populate('userId', 'username avatar')
    .populate('fileId', 'name path')
    .sort({ executedAt: -1 })
    .limit(limit)
    .select('status time memory language executedAt notes isShared');
};

executionResultSchema.statics.findPendingExecutions = function() {
  return this.find({
    'status.id': { $in: [1, 2] }, // In Queue or Processing
    executedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Not older than 10 minutes
  });
};

executionResultSchema.statics.cleanupOldExecutions = function(olderThanDays = 30) {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    executedAt: { $lt: cutoffDate },
    viewCount: 0, // Only delete unviewed executions
    notes: { $in: [null, ''] } // Only delete executions without notes
  });
};

module.exports = mongoose.model('ExecutionResult', executionResultSchema);