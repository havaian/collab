// src/chat/route.js
const express = require('express');
const { body } = require('express-validator');
const chatController = require('./controller');

const router = express.Router();

// Validation rules
const sendMessageValidation = [
    body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be 1-10000 characters'),
    body('type').optional().isIn(['user', 'system']).withMessage('Type must be user or system'),
    body('context').optional().isArray().withMessage('Context must be an array')
];

const editMessageValidation = [
    body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be 1-10000 characters')
];

const reactionValidation = [
    body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji must be 1-10 characters')
];

// Routes
router.get('/:projectId/history', chatController.getChatHistory);
router.post('/:projectId/messages', sendMessageValidation, chatController.sendMessage);
router.put('/:projectId/settings', chatController.updateChatSettings);
router.delete('/:projectId/messages/:messageId', chatController.deleteMessage);
router.put('/:projectId/messages/:messageId', editMessageValidation, chatController.editMessage);
router.post('/:projectId/messages/:messageId/reactions', reactionValidation, chatController.addReaction);
router.post('/:projectId/ai-response', sendMessageValidation, chatController.generateAIResponse);

module.exports = router;