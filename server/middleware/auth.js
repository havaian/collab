const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const Project = require('../models/Project');

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('JWT Authentication error:', err);
      return res.status(500).json({ 
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Optional JWT Authentication (doesn't fail if no token)
const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user
  }
  
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Optional JWT Authentication error:', err);
    }
    
    if (user) {
      req.user = user;
    }
    
    next(); // Continue regardless of auth result
  })(req, res, next);
};

// Check if user is verified
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  if (!req.user.isVerified) {
    return res.status(403).json({
      error: 'Account verification required',
      message: 'Please verify your account to access this feature',
      code: 'VERIFICATION_REQUIRED'
    });
  }
  
  next();
};

// Check if user is active
const requireActive = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  if (!req.user.isActive) {
    return res.status(403).json({
      error: 'Account suspended',
      message: 'Your account has been suspended. Please contact support.',
      code: 'ACCOUNT_SUSPENDED'
    });
  }
  
  next();
};

// Project access control middleware
const requireProjectAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;
      
      if (!projectId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Project ID is required'
        });
      }
      
      const project = await Project.findById(projectId)
        .populate('owner', 'username email')
        .populate('collaborators.user', 'username email');
      
      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project does not exist'
        });
      }
      
      if (project.status === 'deleted') {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project has been deleted'
        });
      }
      
      // Check if user has required access
      if (!project.canUserAccess(req.user._id, action)) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You don't have permission to ${action} this project`,
          requiredRole: getRequiredRole(action)
        });
      }
      
      // Add project to request for use in route handlers
      req.project = project;
      req.userRole = getUserRole(project, req.user._id);
      
      next();
    } catch (error) {
      console.error('Project access check error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Error checking project access'
      });
    }
  };
};

// File access control middleware
const requireFileAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      const fileId = req.params.fileId || req.params.id || req.body.fileId;
      
      if (!fileId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'File ID is required'
        });
      }
      
      const File = require('../models/File');
      const file = await File.findById(fileId).populate('projectId');
      
      if (!file) {
        return res.status(404).json({
          error: 'File not found',
          message: 'The requested file does not exist'
        });
      }
      
      // Check project access first
      if (!file.projectId.canUserAccess(req.user._id, action)) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You don't have permission to ${action} files in this project`
        });
      }
      
      // Check file-specific permissions
      const projectPermissions = {
        canEdit: file.projectId.canUserAccess(req.user._id, 'edit'),
        canView: file.projectId.canUserAccess(req.user._id, 'view')
      };
      
      if (action === 'edit' && !file.canEdit(req.user._id, projectPermissions)) {
        return res.status(403).json({
          error: 'File edit denied',
          message: 'This file is read-only or locked by another user',
          isReadOnly: file.permissions.isReadOnly,
          isLocked: file.permissions.isLocked,
          lockedBy: file.permissions.lockedBy
        });
      }
      
      req.file = file;
      req.project = file.projectId;
      
      next();
    } catch (error) {
      console.error('File access check error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Error checking file access'
      });
    }
  };
};

// Owner-only access
const requireOwnership = (resourceType = 'project') => {
  return (req, res, next) => {
    const resource = req[resourceType];
    
    if (!resource) {
      return res.status(404).json({
        error: `${resourceType} not found`,
        message: `The requested ${resourceType} does not exist`
      });
    }
    
    const ownerId = resource.owner || resource.createdBy || resource.userId;
    
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Owner access required',
        message: `Only the ${resourceType} owner can perform this action`
      });
    }
    
    next();
  };
};

// API key validation middleware
const requireAPIKey = (service = 'openai') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this feature'
      });
    }
    
    const apiKey = req.user.getDecryptedApiKey(service);
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'API key required',
        message: `Please configure your ${service.toUpperCase()} API key in your profile`,
        service,
        setupUrl: `/profile/api-keys`
      });
    }
    
    req.apiKey = apiKey;
    next();
  };
};

// Premium feature middleware
const requirePremium = (req, res, next) => {
  if (!req.user?.isPremium) {
    return res.status(403).json({
      error: 'Premium feature',
      message: 'This feature requires a premium subscription',
      upgradeUrl: '/upgrade'
    });
  }
  
  next();
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of: ${allowedRoles.join(', ')}`,
        userRole: req.userRole,
        requiredRoles: allowedRoles
      });
    }
    
    next();
  };
};

// Utility functions
const getUserRole = (project, userId) => {
  if (project.owner.toString() === userId.toString()) {
    return 'owner';
  }
  
  const collaborator = project.collaborators.find(
    collab => collab.user._id.toString() === userId.toString()
  );
  
  return collaborator ? collaborator.role : 'none';
};

const getRequiredRole = (action) => {
  const roleMap = {
    'view': 'viewer',
    'edit': 'collaborator',
    'delete': 'owner',
    'invite': 'collaborator',
    'execute': 'collaborator',
    'ai': 'viewer'
  };
  
  return roleMap[action] || 'viewer';
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Decode JWT token without verification (for client-side use)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Refresh token validation
const validateRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateJWT,
  optionalJWT,
  requireVerified,
  requireActive,
  requireProjectAccess,
  requireFileAccess,
  requireOwnership,
  requireAPIKey,
  requirePremium,
  requireRole,
  generateToken,
  decodeToken,
  validateRefreshToken,
  getUserRole,
  getRequiredRole
};