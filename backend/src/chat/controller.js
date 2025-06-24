// src/chat/controller.js
const chatService = require('./service');
const { validationResult } = require('express-validator');

class ChatController {
    async getChatHistory(req, res) {
        try {
            const { projectId } = req.params;
            const { limit, before } = req.query;

            const messages = await chatService.getChatHistory(projectId, {
                limit: parseInt(limit) || 50,
                before
            });

            res.json({ messages });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async sendMessage(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { projectId } = req.params;
            const { content, type = 'user', context } = req.body;

            const message = await chatService.saveMessage(projectId, {
                content,
                type,
                author: req.user.id,
                context
            });

            res.status(201).json({ message });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateChatSettings(req, res) {
        try {
            const { projectId } = req.params;
            const settings = await chatService.updateChatSettings(projectId, req.user.id, req.body);
            res.json({ settings });
        } catch (error) {
            const status = error.message.includes('Access denied') ? 403 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async deleteMessage(req, res) {
        try {
            const { projectId, messageId } = req.params;
            const result = await chatService.deleteMessage(projectId, req.user.id, messageId);
            res.json(result);
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('denied') ? 403 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async editMessage(req, res) {
        try {
            const { projectId, messageId } = req.params;
            const { content } = req.body;

            const message = await chatService.editMessage(projectId, req.user.id, messageId, content);
            res.json({ message });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 :
                error.message.includes('denied') ? 403 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async addReaction(req, res) {
        try {
            const { projectId, messageId } = req.params;
            const { emoji } = req.body;

            const reactions = await chatService.addReaction(projectId, req.user.id, messageId, emoji);
            res.json({ reactions });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ error: error.message });
        }
    }

    async generateAIResponse(req, res) {
        try {
            const { projectId } = req.params;
            const { content, context } = req.body;

            // Create a temporary message object for AI context
            const userMessage = {
                content,
                context,
                author: req.user.id
            };

            const response = await chatService.generateAIResponse(projectId, userMessage);
            res.json({ response });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ChatController();