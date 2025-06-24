// src/export/route.js
const express = require('express');
const { body, param } = require('express-validator');
const exportController = require('./controller');

const router = express.Router();

// Validation rules
const exportValidation = [
  param('projectId').isMongoId().withMessage('Valid project ID required'),
  body('type').optional().isIn(['zip', 'file', 'gist']).withMessage('Type must be zip, file, or gist'),
  body('includeDeleted').optional().isBoolean().withMessage('includeDeleted must be boolean'),
  body('fileIds').optional().isArray().withMessage('fileIds must be an array'),
  body('format').optional().isIn(['zip', 'tar', 'tar.gz']).withMessage('Invalid format'),
  body('gistSettings.isPublic').optional().isBoolean().withMessage('gistSettings.isPublic must be boolean'),
  body('gistSettings.description').optional().isString().withMessage('gistSettings.description must be string')
];

// Routes
router.post('/project/:projectId', exportValidation, exportController.exportProject);
router.get('/status/:exportId', exportController.getExportStatus);
router.get('/download/:exportId', exportController.downloadExport);
router.get('/history', exportController.getUserExports);
router.delete('/:exportId', exportController.deleteExport);
router.post('/file/:fileId', exportController.exportSingleFile);

module.exports = router;