const rateLimit = require('express-rate-limit');

// General API rate limiting
const general = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Authentication rate limiting (stricter)
const auth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Code execution rate limiting
const codeExecution = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each user to 20 code executions per windowMs
  message: {
    error: 'Too many code execution requests, please try again later.',
    retryAfter: '15 minutes',
    tip: 'Consider optimizing your code or using local development for frequent testing.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Allow unlimited executions for premium users (if implemented)
    return req.user?.isPremium || false;
  }
});

// AI/Chat rate limiting
const aiChat = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each user to 100 AI interactions per hour
  message: {
    error: 'AI usage limit reached. Please wait before sending more messages.',
    retryAfter: '1 hour',
    tip: 'Consider using more specific queries to get better results with fewer requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return req.user?.isPremium || false;
  }
});

// File upload rate limiting
const fileUpload = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit file operations
  message: {
    error: 'Too many file operations, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Project creation rate limiting
const projectCreation = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit project creation to 5 per hour
  message: {
    error: 'Project creation limit reached. Please wait before creating more projects.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Knowledge base operations
const knowledge = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit knowledge operations
  message: {
    error: 'Too many knowledge base operations, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Search rate limiting
const search = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit search requests
  message: {
    error: 'Too many search requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Create dynamic rate limiter based on user tier
const createDynamicLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: (req) => {
      if (req.user?.isPremium) {
        return options.premiumMax || options.max * 5;
      }
      if (req.user?.isVerified) {
        return options.verifiedMax || options.max * 2;
      }
      return options.max || 100;
    },
    message: options.message || {
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(options.windowMs / 60000) + ' minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip
  });
};

// Usage tracking middleware
const trackUsage = (type) => {
  return async (req, res, next) => {
    if (req.user) {
      try {
        // Use atomic update instead of save() to prevent parallel save errors
        const updateDoc = {
          $set: {
            'usage.lastActive': new Date()
          },
          $inc: {}
        };
        
        // Increment specific usage counters
        switch (type) {
          case 'execution':
            updateDoc.$inc['usage.totalExecutions'] = 1;
            break;
          case 'ai_interaction':
            updateDoc.$inc['usage.totalAIInteractions'] = 1;
            break;
          case 'file_operation':
            updateDoc.$inc['usage.totalFileOperations'] = 1;
            break;
          case 'project_creation':
            updateDoc.$inc['usage.totalProjects'] = 1;
            break;
          default:
            break;
        }
        
        // Use atomic update instead of save() to prevent parallel save errors
        await req.user.constructor.updateOne(
          { _id: req.user._id },
          updateDoc
        );
      } catch (error) {
        console.error('Error tracking usage:', error);
        // Don't block the request if usage tracking fails
      }
    }
    next();
  };
};

// Custom rate limit handler
const handleRateLimit = (req, res) => {
  const retryAfter = Math.round(req.rateLimit.resetTime / 1000);
  
  res.status(429).json({
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later',
    retryAfter: retryAfter,
    limit: req.rateLimit.limit,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime),
    type: 'RATE_LIMIT_EXCEEDED'
  });
};

// Rate limit bypass for development
const bypassInDevelopment = (limiter) => {
  if (process.env.NODE_ENV === 'development') {
    return (req, res, next) => next();
  }
  return limiter;
};

// Adaptive rate limiting based on server load
const adaptiveRateLimit = (baseOptions) => {
  return rateLimit({
    ...baseOptions,
    max: (req) => {
      // Get server metrics (simplified)
      const memUsage = process.memoryUsage();
      const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
      
      let multiplier = 1;
      
      // Reduce limits if server is under high load
      if (memUsagePercent > 0.8) {
        multiplier = 0.5; // Reduce by 50%
      } else if (memUsagePercent > 0.6) {
        multiplier = 0.75; // Reduce by 25%
      }
      
      const baseMax = typeof baseOptions.max === 'function' 
        ? baseOptions.max(req) 
        : baseOptions.max;
      
      return Math.floor(baseMax * multiplier);
    },
    message: (req) => ({
      ...baseOptions.message,
      serverLoad: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.6 ? 'high' : 'normal'
    })
  });
};

// Rate limiting for specific endpoints
const endpointLimiters = {
  // Stricter limits for resource-intensive operations
  heavyComputation: createDynamicLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 5,
    premiumMax: 20,
    verifiedMax: 10,
    message: {
      error: 'Heavy computation limit reached',
      tip: 'Consider optimizing your operations or upgrading your account'
    }
  }),
  
  // Moderate limits for regular operations
  regularOperation: createDynamicLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    premiumMax: 200,
    verifiedMax: 100
  }),
  
  // Lenient limits for read operations
  readOperation: createDynamicLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200,
    premiumMax: 1000,
    verifiedMax: 500
  })
};

// Rate limit info middleware
const addRateLimitInfo = (req, res, next) => {
  res.setHeader('X-RateLimit-Policy', 'User-based with IP fallback');
  res.setHeader('X-RateLimit-Scope', req.user ? 'user' : 'ip');
  next();
};

// Daily quota tracking
const dailyQuota = {
  execution: 100,    // Free users: 100 executions per day
  aiInteraction: 500, // Free users: 500 AI interactions per day
  fileOperations: 1000 // Free users: 1000 file operations per day
};

const checkDailyQuota = (quotaType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    try {
      const today = new Date().toDateString();
      const userQuota = req.user.dailyQuota || {};
      const todayUsage = userQuota[today] || {};
      
      const currentUsage = todayUsage[quotaType] || 0;
      const limit = req.user.isPremium ? dailyQuota[quotaType] * 10 : dailyQuota[quotaType];
      
      if (currentUsage >= limit) {
        return res.status(429).json({
          error: 'Daily quota exceeded',
          message: `You've reached your daily limit for ${quotaType}`,
          quotaType,
          usage: currentUsage,
          limit,
          resetTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
          upgradeAvailable: !req.user.isPremium
        });
      }
      
      // Increment usage
      if (!req.user.dailyQuota) req.user.dailyQuota = {};
      if (!req.user.dailyQuota[today]) req.user.dailyQuota[today] = {};
      req.user.dailyQuota[today][quotaType] = currentUsage + 1;
      
      // Clean up old quota data (keep only last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      Object.keys(req.user.dailyQuota).forEach(date => {
        if (new Date(date) < weekAgo) {
          delete req.user.dailyQuota[date];
        }
      });
      
      req.user.save().catch(err => console.error('Error saving quota:', err));
      
      // Add quota info to response headers
      res.setHeader('X-Daily-Quota-Limit', limit);
      res.setHeader('X-Daily-Quota-Remaining', limit - (currentUsage + 1));
      res.setHeader('X-Daily-Quota-Reset', new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString());
      
      next();
    } catch (error) {
      console.error('Error checking daily quota:', error);
      next(); // Continue on error
    }
  };
};

module.exports = {
  general: bypassInDevelopment(general),
  auth: bypassInDevelopment(auth),
  codeExecution: bypassInDevelopment(codeExecution),
  aiChat: bypassInDevelopment(aiChat),
  fileUpload: bypassInDevelopment(fileUpload),
  projectCreation: bypassInDevelopment(projectCreation),
  knowledge: bypassInDevelopment(knowledge),
  search: bypassInDevelopment(search),
  
  // Dynamic limiters
  createDynamicLimiter,
  adaptiveRateLimit,
  endpointLimiters,
  
  // Middleware
  trackUsage,
  handleRateLimit,
  addRateLimitInfo,
  checkDailyQuota,
  
  // Utilities
  bypassInDevelopment
};