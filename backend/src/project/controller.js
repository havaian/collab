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
            res.status(201).json({ project });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getUserProjects(req, res) {
        try {
            const { page, limit, search, sortBy } = req.query;
            const result = await projectService.getUserProjects(req.user.id, {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                sortBy
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getProject(req, res) {
        try {
            const project = await projectService.getProjectById(req.params.id, req.user.id);
            res.json({ project });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    async updateProject(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const project = await projectService.updateProject(req.params.id, req.user.id, req.body);
            res.json({ project });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    async deleteProject(req, res) {
        try {
            const result = await projectService.deleteProject(req.params.id, req.user.id);
            res.json(result);
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('owner') ? 403 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    async joinProject(req, res) {
        try {
            const { inviteCode } = req.body;
            const project = await projectService.joinProject(req.params.id, req.user.id, inviteCode);
            res.json({ project });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async leaveProject(req, res) {
        try {
            const result = await projectService.leaveProject(req.params.id, req.user.id);
            res.json(result);
        } catch (error) {
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async getPublicProjects(req, res) {
        try {
            const { page, limit, search } = req.query;
            const result = await projectService.getPublicProjects({
                page: parseInt(page),
                limit: parseInt(limit),
                search
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ProjectController();