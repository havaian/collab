const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please correct the following errors',
      errors: formattedErrors,
      errorCount: formattedErrors.length
    });
  }
  
  next();
};

// Custom validators
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const isValidUsername = (value) => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(value);
};

const isValidFileName = (value) => {
  // Check for invalid characters and length
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  return !invalidChars.test(value) && value.length > 0 && value.length <= 255;
};

const isValidFilePath = (value) => {
  // Basic path validation - no absolute paths, no parent directory traversal
  return !value.includes('..') && !value.startsWith('/') && value.length <= 1000;
};

const isValidLanguage = (value) => {
  const supportedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
    'go', 'rust', 'kotlin', 'ruby', 'php', 'html', 'css', 'scss',
    'json', 'xml', 'yaml', 'markdown', 'txt', 'sql', 'shell'
  ];
  return supportedLanguages.includes(value);
};

// Validation rules for different entities
const userValidation = {
  create: [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .custom(isValidUsername)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    
    body('displayName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Display name cannot exceed 50 characters')
  ],
  
  update: [
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .custom(isValidUsername)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('displayName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Display name cannot exceed 50 characters'),
    
    body('preferences.theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Theme must be light, dark, or auto'),
    
    body('preferences.defaultAIModel')
      .optional()
      .isIn(['gpt-4', 'gpt-3.5-turbo'])
      .withMessage('AI model must be gpt-4 or gpt-3.5-turbo')
  ],
  
  apiKey: [
    body('service')
      .isIn(['openai'])
      .withMessage('Service must be openai'),
    
    body('apiKey')
      .isLength({ min: 10 })
      .withMessage('API key appears to be invalid')
      .matches(/^sk-/)
      .withMessage('OpenAI API key must start with sk-')
  ]
};

const projectValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be between 1 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters'),
    
    body('settings.aiModel')
      .optional()
      .isIn(['gpt-4', 'gpt-3.5-turbo'])
      .withMessage('AI model must be gpt-4 or gpt-3.5-turbo'),
    
    body('settings.defaultTheme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Theme must be light, dark, or auto')
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be between 1 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items')
  ],
  
  addCollaborator: [
    body('userId')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID'),
    
    body('role')
      .isIn(['viewer', 'collaborator'])
      .withMessage('Role must be viewer or collaborator')
  ]
};

const fileValidation = {
  create: [
    body('name')
      .trim()
      .custom(isValidFileName)
      .withMessage('Invalid file name'),
    
    body('path')
      .trim()
      .custom(isValidFilePath)
      .withMessage('Invalid file path'),
    
    body('content')
      .optional()
      .isLength({ max: 1000000 })
      .withMessage('File content cannot exceed 1MB'),
    
    body('language')
      .optional()
      .custom(isValidLanguage)
      .withMessage('Unsupported programming language'),
    
    body('type')
      .optional()
      .isIn(['code', 'text', 'markdown', 'json', 'config'])
      .withMessage('File type must be code, text, markdown, json, or config')
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .custom(isValidFileName)
      .withMessage('Invalid file name'),
    
    body('content')
      .optional()
      .isLength({ max: 1000000 })
      .withMessage('File content cannot exceed 1MB'),
    
    body('message')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Commit message cannot exceed 200 characters')
  ]
};

const chatValidation = {
  sendMessage: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Message content must be between 1 and 50000 characters'),
    
    body('threadId')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Thread ID must be between 1 and 100 characters'),
    
    body('model')
      .optional()
      .isIn(['gpt-4', 'gpt-3.5-turbo'])
      .withMessage('AI model must be gpt-4 or gpt-3.5-turbo'),
    
    body('includeContext')
      .optional()
      .isBoolean()
      .withMessage('includeContext must be a boolean')
  ],
  
  editMessage: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Message content must be between 1 and 50000 characters')
  ],
  
  createThread: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Thread name must be between 1 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Thread description cannot exceed 500 characters')
  ]
};

const knowledgeValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    
    body('content')
      .trim()
      .isLength({ min: 1, max: 100000 })
      .withMessage('Content must be between 1 and 100000 characters'),
    
    body('type')
      .optional()
      .isIn(['document', 'code-snippet', 'note', 'reference', 'api-doc', 'tutorial'])
      .withMessage('Invalid knowledge item type'),
    
    body('format')
      .optional()
      .isIn(['markdown', 'text', 'code', 'json', 'yaml'])
      .withMessage('Format must be markdown, text, code, json, or yaml'),
    
    body('language')
      .optional()
      .custom(isValidLanguage)
      .withMessage('Unsupported programming language'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters'),
    
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot exceed 50 characters'),
    
    body('contextPriority')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Context priority must be between 1 and 10')
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100000 })
      .withMessage('Content must be between 1 and 100000 characters'),
    
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived'])
      .withMessage('Status must be draft, published, or archived')
  ]
};

const codeExecutionValidation = {
  execute: [
    body('code')
      .trim()
      .isLength({ min: 1, max: 100000 })
      .withMessage('Code must be between 1 and 100000 characters'),
    
    body('languageId')
      .isInt({ min: 1, max: 100 })
      .withMessage('Language ID must be a valid integer'),
    
    body('stdin')
      .optional()
      .isLength({ max: 10000 })
      .withMessage('Input cannot exceed 10000 characters'),
    
    body('fileId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid file ID')
  ]
};

// Parameter validation
const paramValidation = {
  objectId: param('id').custom(isValidObjectId).withMessage('Invalid ID format'),
  projectId: param('projectId').custom(isValidObjectId).withMessage('Invalid project ID'),
  fileId: param('fileId').custom(isValidObjectId).withMessage('Invalid file ID'),
  userId: param('userId').custom(isValidObjectId).withMessage('Invalid user ID'),
  messageId: param('messageId').notEmpty().withMessage('Message ID is required'),
  token: param('token').isAlphanumeric().withMessage('Invalid token format')
};

// Query validation
const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('skip')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Skip must be a non-negative integer')
  ],
  
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    query('type')
      .optional()
      .isAlpha()
      .withMessage('Type must contain only letters'),
    
    query('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot exceed 50 characters')
  ],
  
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ]
};

// File upload validation
const fileUploadValidation = {
  single: (fieldName, options = {}) => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options;
    
    return (req, res, next) => {
      if (!req.file) {
        return res.status(400).json({
          error: 'File required',
          message: `Please upload a file in the ${fieldName} field`
        });
      }
      
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `File size cannot exceed ${Math.round(maxSize / (1024 * 1024))}MB`,
          fileSize: req.file.size,
          maxSize
        });
      }
      
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: `Only ${allowedTypes.join(', ')} files are allowed`,
          fileType: req.file.mimetype,
          allowedTypes
        });
      }
      
      next();
    };
  }
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove potential XSS patterns
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    
    return obj;
  };
  
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  
  next();
};

// Rate limit validation
const validateRateLimit = (req, res, next) => {
  // Add custom rate limit validation logic
  if (req.rateLimit && req.rateLimit.remaining < 5) {
    res.setHeader('X-RateLimit-Warning', 'Approaching rate limit');
  }
  
  next();
};

// Content length validation
const validateContentLength = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = typeof maxSize === 'string' ? 
      parseInt(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024) : 
      maxSize;
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Payload too large',
        message: `Request body cannot exceed ${maxSize}`,
        contentLength,
        maxSize: maxBytes
      });
    }
    
    next();
  };
};

// Custom validation helpers
const customValidators = {
  // Check if array contains only unique values
  isUniqueArray: (array) => {
    return new Set(array).size === array.length;
  },
  
  // Validate URL format
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  // Validate hex color
  isValidHexColor: (color) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  },
  
  // Validate JSON string
  isValidJSON: (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
};

// Validation chains for common patterns
const commonValidation = {
  id: param('id').custom(isValidObjectId).withMessage('Invalid ID'),
  
  optionalId: param('id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid ID'),
  
  requiredString: (field, min = 1, max = 255) => 
    body(field)
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`),
  
  optionalString: (field, max = 255) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max })
      .withMessage(`${field} cannot exceed ${max} characters`),
  
  arrayOfStrings: (field, maxItems = 10, maxLength = 50) => [
    body(field)
      .optional()
      .isArray({ max: maxItems })
      .withMessage(`${field} must be an array with maximum ${maxItems} items`),
    
    body(`${field}.*`)
      .trim()
      .isLength({ min: 1, max: maxLength })
      .withMessage(`Each ${field} item must be between 1 and ${maxLength} characters`)
  ]
};

module.exports = {
  handleValidationErrors,
  userValidation,
  projectValidation,
  fileValidation,
  chatValidation,
  knowledgeValidation,
  codeExecutionValidation,
  paramValidation,
  queryValidation,
  fileUploadValidation,
  sanitizeInput,
  validateRateLimit,
  validateContentLength,
  customValidators,
  commonValidation,
  
  // Custom validators for reuse
  isValidObjectId,
  isValidEmail,
  isValidUsername,
  isValidFileName,
  isValidFilePath,
  isValidLanguage
};