// src/project/controller.js
const projectService = require('./service');
const { validationResult } = require('express-validator');

class ProjectController {
    async createProject(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const project = await projectService.createProject(req.user.id, req.body);
            res.status(201).json({
                success: true,
                project
            });
        } catch (error) {
            console.error('Create project error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    async getUserProjects(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy = 'updatedAt' } = req.query;
            const result = await projectService.getUserProjects(req.user.id, {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                sortBy
            });

            res.json({
                success: true,
                projects: result.projects,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Get user projects error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load projects',
                message: error.message
            });
        }
    }

    async getProject(req, res) {
        try {
            const project = await projectService.getProjectById(req.params.id, req.user.id);
            res.json({
                success: true,
                project
            });
        } catch (error) {
            console.error('Get project error:', error);
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 500;
            res.status(status).json({
                success: false,
                error: error.message
            });
        }
    }

    async updateProject(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const project = await projectService.updateProject(req.params.id, req.user.id, req.body);
            res.json({
                success: true,
                project
            });
        } catch (error) {
            console.error('Update project error:', error);
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 500;
            res.status(status).json({
                success: false,
                error: error.message
            });
        }
    }

    async deleteProject(req, res) {
        try {
            const result = await projectService.deleteProject(req.params.id, req.user.id);
            res.json({
                success: true,
                message: 'Project deleted successfully'
            });
        } catch (error) {
            console.error('Delete project error:', error);
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('owner') ? 403 : 500;
            res.status(status).json({
                success: false,
                error: error.message
            });
        }
    }

    // Add this missing method for the addCollaborator route
    async addCollaborator(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { email, username, role = 'collaborator' } = req.body;

            // You can add a collaborator by email, username, or user ID
            const project = await projectService.addCollaborator(
                req.params.id,
                req.user.id,
                { email, username, role }
            );

            res.json({
                success: true,
                project,
                message: 'Collaborator added successfully'
            });
        } catch (error) {
            console.error('Add collaborator error:', error);
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 400;
            res.status(status).json({
                success: false,
                error: 'Failed to add collaborator',
                message: error.message
            });
        }
    }

    async joinProject(req, res) {
        try {
            const { inviteCode } = req.body;
            const project = await projectService.joinProject(req.params.id, req.user.id, inviteCode);
            res.json({
                success: true,
                project,
                message: 'Successfully joined project'
            });
        } catch (error) {
            console.error('Join project error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({
                success: false,
                error: error.message
            });
        }
    }

    async leaveProject(req, res) {
        try {
            const result = await projectService.leaveProject(req.params.id, req.user.id);
            res.json({
                success: true,
                message: 'Left project successfully'
            });
        } catch (error) {
            console.error('Leave project error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({
                success: false,
                error: error.message
            });
        }
    }

    async getPublicProjects(req, res) {
        try {
            const { page = 1, limit = 10, search } = req.query;
            const result = await projectService.getPublicProjects({
                page: parseInt(page),
                limit: parseInt(limit),
                search
            });

            res.json({
                success: true,
                projects: result.projects,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Get public projects error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load public projects',
                message: error.message
            });
        }
    }

    // Additional method to remove a collaborator
    async removeCollaborator(req, res) {
        try {
            const { collaboratorId } = req.params;
            const project = await projectService.removeCollaborator(
                req.params.id,
                req.user.id,
                collaboratorId
            );

            res.json({
                success: true,
                project,
                message: 'Collaborator removed successfully'
            });
        } catch (error) {
            console.error('Remove collaborator error:', error);
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 400;
            res.status(status).json({
                success: false,
                error: 'Failed to remove collaborator',
                message: error.message
            });
        }
    }
}

module.exports = new ProjectController();