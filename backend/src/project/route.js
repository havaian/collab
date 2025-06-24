// src/project/route.js
const express = require('express');
const { body } = require('express-validator');
const projectController = require('./controller');

const router = express.Router();

// Validation rules
const createProjectValidation = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('settings.language').optional().isString().withMessage('Language must be a string'),
    body('settings.theme').optional().isString().withMessage('Theme must be a string')
];

const updateProjectValidation = [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    body('settings').optional().isObject().withMessage('Settings must be an object')
];

// Routes
router.get('/', projectController.getUserProjects);
router.post('/', createProjectValidation, projectController.createProject);
router.get('/public', projectController.getPublicProjects);
router.get('/:id', projectController.getProject);
router.put('/:id', updateProjectValidation, projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.post('/:id/join', projectController.joinProject);
router.post('/:id/leave', projectController.leaveProject);

module.exports = router;