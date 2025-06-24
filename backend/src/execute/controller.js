// src/execute/controller.js
const executeService = require('./service');
const { validationResult } = require('express-validator');

class ExecuteController {
    async executeCode(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { code, language, stdin, projectId, fileId } = req.body;

            const result = await executeService.executeCode({
                code,
                language,
                stdin,
                userId: req.user.id,
                projectId,
                fileId
            });

            res.json(result);
        } catch (error) {
            const status = error.message.includes('Rate limit') ? 429 :
                error.message.includes('access denied') ? 403 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async getExecutionHistory(req, res) {
        try {
            const { projectId, limit, page } = req.query;

            const result = await executeService.getExecutionHistory(req.user.id, {
                projectId,
                limit: parseInt(limit),
                page: parseInt(page)
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getExecution(req, res) {
        try {
            const { executionId } = req.params;
            const execution = await executeService.getExecutionById(executionId, req.user.id);
            res.json({ execution });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    async deleteExecution(req, res) {
        try {
            const { executionId } = req.params;
            const result = await executeService.deleteExecution(executionId, req.user.id);
            res.json(result);
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('Access denied') ? 403 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    async getExecutionStats(req, res) {
        try {
            const { projectId } = req.query;
            const stats = await executeService.getExecutionStats(req.user.id, projectId);
            res.json({ stats });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Middleware for rate limiting
    applyRateLimit() {
        return executeService.executionLimiter;
    }
}

module.exports = new ExecuteController();