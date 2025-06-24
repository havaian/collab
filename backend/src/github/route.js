// src/github/route.js
const express = require('express');
const { body, param } = require('express-validator');
const githubController = require('./controller');

const router = express.Router();

// Validation rules
const importRepoValidation = [
  param('projectId').isMongoId().withMessage('Valid project ID required'),
  body('repoFullName').matches(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/).withMessage('Valid repository name required (owner/repo)'),
  body('branch').optional().isString().withMessage('Branch must be a string'),
  body('includePaths').optional().isArray().withMessage('includePaths must be an array'),
  body('excludePaths').optional().isArray().withMessage('excludePaths must be an array'),
  body('maxDepth').optional().isInt({ min: 1, max: 10 }).withMessage('maxDepth must be between 1 and 10')
];

const createRepoValidation = [
  param('projectId').isMongoId().withMessage('Valid project ID required'),
  body('name').optional().matches(/^[a-zA-Z0-9._-]+$/).withMessage('Repository name can only contain letters, numbers, dots, hyphens, and underscores'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
  body('includeReadme').optional().isBoolean().withMessage('includeReadme must be a boolean')
];

// Routes
router.get('/repositories', githubController.getUserRepositories);
router.get('/repositories/:repoFullName/contents', githubController.getRepositoryContents);
router.post('/projects/:projectId/import', importRepoValidation, githubController.importRepository);
router.post('/projects/:projectId/sync', githubController.syncRepository);
router.post('/projects/:projectId/create-repo', createRepoValidation, githubController.createRepository);
router.post('/projects/:projectId/push', githubController.pushToRepository);
router.delete('/projects/:projectId/disconnect', githubController.disconnectRepository);

module.exports = router;