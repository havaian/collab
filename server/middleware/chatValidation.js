const { body, param, query } = require('express-validator');

const chatValidation = {
  sendMessage: [
    param('projectId')
      .isMongoId()
      .withMessage('Invalid project ID'),
    
    body('message')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Message must be between 1 and 5000 characters'),
    
    body('threadId')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Thread ID must be a string with max 100 characters'),
    
    body('includeContext')
      .optional()
      .isBoolean()
      .withMessage('includeContext must be a boolean'),
    
    body('model')
      .optional()
      .isIn([
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k', 
        'gpt-4',
        'gpt-4-32k',
        'gpt-4-turbo-preview'
      ])
      .withMessage('Invalid AI model'),
    
    body('temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),
    
    body('maxTokens')
      .optional()
      .isInt({ min: 1, max: 8000 })
      .withMessage('Max tokens must be between 1 and 8000')
  ],

  updateSettings: [
    param('projectId')
      .isMongoId()
      .withMessage('Invalid project ID'),
    
    body('aiModel')
      .optional()
      .isIn([
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-4', 
        'gpt-4-32k',
        'gpt-4-turbo-preview'
      ])
      .withMessage('Invalid AI model'),
    
    body('temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),
    
    body('maxTokens')
      .optional()
      .isInt({ min: 1, max: 8000 })
      .withMessage('Max tokens must be between 1 and 8000'),
    
    body('systemPrompt')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('System prompt cannot exceed 2000 characters')
  ],

  getMessages: [
    param('projectId')
      .isMongoId()
      .withMessage('Invalid project ID'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    
    query('threadId')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Thread ID must be a string with max 100 characters')
  ],

  createThread: [
    param('projectId')
      .isMongoId()
      .withMessage('Invalid project ID'),
    
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Thread title must be between 1 and 100 characters')
  ]
};

module.exports = { chatValidation };