// src/file/route.js
const express = require('express');
const { body } = require('express-validator');
const fileController = require('./controller');

const router = express.Router();

// Validation rules
const createFileValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('type').optional().isIn(['file', 'folder']).withMessage('Type must be file or folder'),
  body('parentFolder').optional().isMongoId().withMessage('Parent folder must be a valid ID')
];

const updateFileValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('language').optional().isString().withMessage('Language must be a string'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

// Routes
router.get('/project/:projectId', fileController.getProjectFiles);
router.post('/project/:projectId', createFileValidation, fileController.createFile);
router.get('/:id', fileController.getFile);
router.put('/:id', updateFileValidation, fileController.updateFile);
router.delete('/:id', fileController.deleteFile);
router.put('/:id/move', fileController.moveFile);
router.post('/:id/duplicate', fileController.duplicateFile);

module.exports = router;