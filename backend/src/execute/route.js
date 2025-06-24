// src/execute/route.js
const express = require('express');
const { body } = require('express-validator');
const executeController = require('./controller');

const router = express.Router();

// Validation rules
const executeValidation = [
    body('code').trim().isLength({ min: 1, max: 100000 }).withMessage('Code must be 1-100000 characters'),
    body('language').trim().isLength({ min: 1 }).withMessage('Language is required'),
    body('projectId').isMongoId().withMessage('Valid project ID is required'),
    body('stdin').optional().isLength({ max: 10000 }).withMessage('Input must be less than 10000 characters'),
    body('fileId').optional().isMongoId().withMessage('File ID must be valid')
];

// Routes
router.post('/', executeController.applyRateLimit(), executeValidation, executeController.executeCode);
router.get('/history', executeController.getExecutionHistory);
router.get('/stats', executeController.getExecutionStats);
router.get('/:executionId', executeController.getExecution);
router.delete('/:executionId', executeController.deleteExecution);

module.exports = router;