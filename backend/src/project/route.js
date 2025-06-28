// src/project/route.js
const express = require('express');
const router = express.Router();
const projectController = require('./controller');
const { authMiddleware } = require('../auth/middleware');

// Apply auth middleware to all project routes
router.use(authMiddleware);

// Project CRUD routes
router.get('/', projectController.getUserProjects);
router.get('/public', projectController.getPublicProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Collaboration routes
router.post('/:id/collaborators', projectController.addCollaborator);
router.delete('/:id/collaborators/:collaboratorId', projectController.removeCollaborator);
router.post('/:id/join', projectController.joinProject);
router.post('/:id/leave', projectController.leaveProject);

router.use('/:projectId/files', require('../file/route'));

module.exports = router;