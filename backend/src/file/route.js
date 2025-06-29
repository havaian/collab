// backend/src/file/route.js - FIXED VERSION
const express = require('express');
const { body, param, query } = require('express-validator');
const fileController = require('./controller');
const { authMiddleware } = require('../auth/middleware');

const router = express.Router();

// Apply auth middleware to all file routes
router.use(authMiddleware);

// Validation rules
const createFileValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('type').optional().isIn(['file', 'folder']).withMessage('Type must be file or folder'),
  body('parentFolder').optional().custom(value => {
    if (value && !value.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Parent folder must be a valid MongoDB ObjectId');
    }
    return true;
  })
];

const updateFileValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('language').optional().isString().isLength({ max: 50 }).withMessage('Language must be a string (max 50 chars)'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const moveFileValidation = [
  body('parentFolder').optional().custom(value => {
    if (value !== null && value !== undefined && value !== '' && !value.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Parent folder must be a valid MongoDB ObjectId or null');
    }
    return true;
  })
];

const duplicateFileValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters')
];

const batchOperationValidation = [
  body('fileIds').isArray({ min: 1, max: 50 }).withMessage('fileIds must be an array of 1-50 items'),
  body('fileIds.*').isMongoId().withMessage('Each fileId must be a valid MongoDB ObjectId')
];

const mongoIdValidation = [
  param('id').isMongoId().withMessage('File ID must be a valid MongoDB ObjectId'),
  param('projectId').isMongoId().withMessage('Project ID must be a valid MongoDB ObjectId')
];

// Routes with proper validation and error handling

// Get project files
router.get('/project/:projectId', 
  [param('projectId').isMongoId().withMessage('Project ID must be valid')],
  fileController.getProjectFiles
);

// Create new file in project
router.post('/project/:projectId', 
  [param('projectId').isMongoId().withMessage('Project ID must be valid'), ...createFileValidation],
  fileController.createFile
);

// Get single file
router.get('/:id', 
  mongoIdValidation,
  fileController.getFile
);

// Update file with comprehensive validation
router.put('/:id', 
  [param('id').isMongoId().withMessage('File ID must be valid'), ...updateFileValidation],
  fileController.updateFile
);

// Delete file
router.delete('/:id', 
  [
    param('id').isMongoId().withMessage('File ID must be valid'),
    query('permanent').optional().isBoolean().withMessage('permanent must be a boolean')
  ],
  fileController.deleteFile
);

// Move file with validation
router.put('/:id/move', 
  [param('id').isMongoId().withMessage('File ID must be valid'), ...moveFileValidation],
  fileController.moveFile
);

// Duplicate file with validation  
router.post('/:id/duplicate', 
  [param('id').isMongoId().withMessage('File ID must be valid'), ...duplicateFileValidation],
  fileController.duplicateFile
);

// Batch operations
router.post('/batch/delete',
  [...batchOperationValidation, body('permanent').optional().isBoolean()],
  fileController.batchDelete
);

router.post('/batch/move',
  [
    ...batchOperationValidation,
    body('parentFolder').optional().custom(value => {
      if (value !== null && value !== undefined && value !== '' && !value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Parent folder must be a valid MongoDB ObjectId or null');
      }
      return true;
    })
  ],
  fileController.batchMove
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('File route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;