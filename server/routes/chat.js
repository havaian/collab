const express = require('express');
const Chat = require('../models/Chat');
const Project = require('../models/Project');
const aiService = require('../services/aiService');
const { 
  authenticateJWT, 
  requireProjectAccess,
  requireAPIKey 
} = require('../middleware/auth');
const { 
  chatValidation, 
  handleValidationErrors,
  paramValidation,
  queryValidation
} = require('../middleware/validation');
const { 
  aiChat,
  trackUsage,
  checkDailyQuota
} = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get chat history for project
router.get('/project/:projectId',
  paramValidation.projectId,
  queryValidation.pagination,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { threadId, limit = 50, skip = 0 } = req.query;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      const messages = chat.getMessages(threadId, parseInt(limit), parseInt(skip));

      res.json({
        messages,
        threads: chat.activeThreads,
        settings: chat.settings,
        stats: chat.stats
      });

    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({
        error: 'Failed to fetch chat history',
        message: 'Unable to retrieve chat messages'
      });
    }
  }
);

// Send message to AI
router.post('/project/:projectId/message',
  paramValidation.projectId,
  aiChat,
  checkDailyQuota('aiInteraction'),
  trackUsage('ai_interaction'),
  chatValidation.sendMessage,
  handleValidationErrors,
  requireProjectAccess('ai'),
  requireAPIKey('openai'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { 
        content, 
        threadId = 'main', 
        model, 
        includeContext = true,
        temperature,
        maxTokens
      } = req.body;

      // Get or create chat
      let chat = await Chat.findByProject(projectId);
      if (!chat) {
        chat = await Chat.createForProject(projectId);
      }

      // Get previous messages for context
      const previousMessages = chat.getMessages(threadId, 10)
        .filter(msg => msg.type !== 'system')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Add user message to chat
      const userMessage = await chat.addMessage({
        type: 'user',
        content,
        author: req.user._id,
        threadId
      });

      // Get AI response
      const aiResponse = await aiService.sendMessage({
        message: content,
        apiKey: req.apiKey,
        model: model || chat.settings.aiModel,
        temperature: temperature || chat.settings.temperature,
        maxTokens: maxTokens || chat.settings.maxTokens,
        projectId,
        userId: req.user._id,
        includeContext,
        previousMessages
      });

      // Add AI response to chat
      const assistantMessage = await chat.addMessage({
        type: 'assistant',
        content: aiResponse.message,
        model: aiResponse.model,
        tokens: {
          prompt: aiResponse.usage.promptTokens,
          completion: aiResponse.usage.completionTokens,
          total: aiResponse.usage.totalTokens
        },
        context: aiResponse.context,
        threadId
      });

      // Update chat stats
      chat.stats.totalCost += aiResponse.cost;
      await chat.save();

      // Notify other project members
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:new_messages', {
          projectId,
          messages: [userMessage.messages[userMessage.messages.length - 2], assistantMessage.messages[assistantMessage.messages.length - 1]],
          threadId
        });
      }

      res.json({
        userMessage: userMessage.messages[userMessage.messages.length - 2],
        assistantMessage: assistantMessage.messages[assistantMessage.messages.length - 1],
        usage: aiResponse.usage,
        cost: aiResponse.cost,
        context: aiResponse.context
      });

    } catch (error) {
      console.error('Error sending AI message:', error);
      
      // Handle specific AI service errors
      let errorMessage = 'Failed to send message to AI';
      let statusCode = 500;
      
      if (error.message.includes('Invalid API key')) {
        errorMessage = 'Invalid OpenAI API key';
        statusCode = 401;
      } else if (error.message.includes('Rate limit exceeded')) {
        errorMessage = 'AI service rate limit exceeded';
        statusCode = 429;
      } else if (error.message.includes('API Error')) {
        errorMessage = error.message;
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: 'AI message failed',
        message: errorMessage
      });
    }
  }
);

// Edit message
router.put('/project/:projectId/message/:messageId',
  paramValidation.projectId,
  paramValidation.messageId,
  chatValidation.editMessage,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId, messageId } = req.params;
      const { content } = req.body;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      await chat.editMessage(messageId, content, req.user._id);

      // Notify other users
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:message_edited', {
          projectId,
          messageId,
          content,
          editedBy: req.user._id
        });
      }

      res.json({
        message: 'Message edited successfully'
      });

    } catch (error) {
      console.error('Error editing message:', error);
      res.status(400).json({
        error: 'Failed to edit message',
        message: error.message || 'Unable to edit message'
      });
    }
  }
);

// Delete message
router.delete('/project/:projectId/message/:messageId',
  paramValidation.projectId,
  paramValidation.messageId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId, messageId } = req.params;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      await chat.deleteMessage(messageId, req.user._id);

      // Notify other users
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:message_deleted', {
          projectId,
          messageId,
          deletedBy: req.user._id
        });
      }

      res.json({
        message: 'Message deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(400).json({
        error: 'Failed to delete message',
        message: error.message || 'Unable to delete message'
      });
    }
  }
);

// Create new thread
router.post('/project/:projectId/thread',
  paramValidation.projectId,
  chatValidation.createThread,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      const threadId = await chat.createThread(name, description, req.user._id);

      // Notify other users
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:thread_created', {
          projectId,
          thread: {
            id: threadId,
            name,
            description,
            createdBy: req.user._id
          }
        });
      }

      res.status(201).json({
        message: 'Thread created successfully',
        threadId
      });

    } catch (error) {
      console.error('Error creating thread:', error);
      res.status(500).json({
        error: 'Failed to create thread',
        message: 'Unable to create chat thread'
      });
    }
  }
);

// Archive thread
router.put('/project/:projectId/thread/:threadId/archive',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('edit'),
  async (req, res) => {
    try {
      const { projectId, threadId } = req.params;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      await chat.archiveThread(threadId);

      // Notify other users
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:thread_archived', {
          projectId,
          threadId,
          archivedBy: req.user._id
        });
      }

      res.json({
        message: 'Thread archived successfully'
      });

    } catch (error) {
      console.error('Error archiving thread:', error);
      res.status(400).json({
        error: 'Failed to archive thread',
        message: error.message || 'Unable to archive thread'
      });
    }
  }
);

// Add reaction to message
router.post('/project/:projectId/message/:messageId/reaction',
  paramValidation.projectId,
  paramValidation.messageId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId, messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji || emoji.length > 10) {
        return res.status(400).json({
          error: 'Invalid emoji',
          message: 'Emoji is required and must be less than 10 characters'
        });
      }

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      await chat.addReaction(messageId, emoji, req.user._id);

      // Notify other users
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:reaction_added', {
          projectId,
          messageId,
          emoji,
          userId: req.user._id
        });
      }

      res.json({
        message: 'Reaction added successfully'
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(400).json({
        error: 'Failed to add reaction',
        message: error.message || 'Unable to add reaction'
      });
    }
  }
);

// Update chat settings
router.put('/project/:projectId/settings',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('edit'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { aiModel, temperature, maxTokens, includeContext } = req.body;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      // Update settings
      if (aiModel) chat.settings.aiModel = aiModel;
      if (temperature !== undefined) chat.settings.temperature = temperature;
      if (maxTokens) chat.settings.maxTokens = maxTokens;
      if (includeContext !== undefined) {
        if (includeContext.files !== undefined) chat.settings.includeContext.files = includeContext.files;
        if (includeContext.knowledge !== undefined) chat.settings.includeContext.knowledge = includeContext.knowledge;
        if (includeContext.previousMessages !== undefined) chat.settings.includeContext.previousMessages = includeContext.previousMessages;
      }

      await chat.save();

      res.json({
        message: 'Chat settings updated successfully',
        settings: chat.settings
      });

    } catch (error) {
      console.error('Error updating chat settings:', error);
      res.status(500).json({
        error: 'Failed to update settings',
        message: 'Unable to update chat settings'
      });
    }
  }
);

// Get chat statistics
router.get('/project/:projectId/stats',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { timeframe = 'week' } = req.query;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      const tokenUsage = chat.getTokenUsage(timeframe);
      
      res.json({
        stats: chat.stats,
        tokenUsage,
        timeframe,
        threads: chat.threads.map(thread => ({
          id: thread.id,
          name: thread.name,
          messageCount: thread.messageCount,
          isActive: thread.isActive
        }))
      });

    } catch (error) {
      console.error('Error fetching chat stats:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'Unable to retrieve chat statistics'
      });
    }
  }
);

// Export chat history
router.get('/project/:projectId/export',
  paramValidation.projectId,
  queryValidation.dateRange,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { format = 'json', threadId, startDate, endDate } = req.query;

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      let messages = chat.messages;

      // Filter by thread
      if (threadId) {
        messages = messages.filter(msg => msg.threadId === threadId);
      }

      // Filter by date range
      if (startDate || endDate) {
        messages = messages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          if (startDate && msgDate < new Date(startDate)) return false;
          if (endDate && msgDate > new Date(endDate)) return false;
          return true;
        });
      }

      // Format export data
      const exportData = {
        projectId,
        exportedAt: new Date().toISOString(),
        threadId: threadId || 'all',
        messageCount: messages.length,
        messages: messages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          author: msg.author,
          timestamp: msg.timestamp,
          threadId: msg.threadId,
          tokens: msg.tokens
        }))
      };

      // Set response headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `chat-export-${projectId}-${timestamp}.${format}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (format === 'csv') {
        // Convert to CSV
        const csvHeaders = 'ID,Type,Content,Author,Timestamp,Thread,Tokens\n';
        const csvRows = messages.map(msg => 
          `"${msg.id}","${msg.type}","${msg.content.replace(/"/g, '""')}","${msg.author}","${msg.timestamp}","${msg.threadId}","${msg.tokens?.total || 0}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvHeaders + csvRows);
      } else {
        // Default to JSON
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
      }

    } catch (error) {
      console.error('Error exporting chat:', error);
      res.status(500).json({
        error: 'Failed to export chat',
        message: 'Unable to export chat history'
      });
    }
  }
);

// Clear chat history
router.delete('/project/:projectId',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('edit'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { threadId, confirmClear } = req.body;

      if (!confirmClear) {
        return res.status(400).json({
          error: 'Confirmation required',
          message: 'Please confirm chat history deletion'
        });
      }

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      if (threadId && threadId !== 'all') {
        // Clear specific thread
        chat.messages = chat.messages.filter(msg => msg.threadId !== threadId);
      } else {
        // Clear all messages
        chat.messages = [];
      }

      // Reset stats
      chat.stats.totalMessages = chat.messages.length;
      chat.stats.totalTokens = chat.messages.reduce((total, msg) => total + (msg.tokens?.total || 0), 0);
      chat.stats.aiInteractions = chat.messages.filter(msg => msg.type === 'assistant').length;
      
      await chat.save();

      // Notify other users
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:history_cleared', {
          projectId,
          threadId: threadId || 'all',
          clearedBy: req.user._id
        });
      }

      res.json({
        message: 'Chat history cleared successfully'
      });

    } catch (error) {
      console.error('Error clearing chat history:', error);
      res.status(500).json({
        error: 'Failed to clear chat history',
        message: 'Unable to clear chat history'
      });
    }
  }
);

// Search chat messages
router.get('/project/:projectId/search',
  paramValidation.projectId,
  queryValidation.search,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { q: query, threadId, type, limit = 20 } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          error: 'Query required',
          message: 'Search query is required'
        });
      }

      const chat = await Chat.findByProject(projectId);
      
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat found for this project'
        });
      }

      // Filter and search messages
      let messages = chat.messages;

      if (threadId) {
        messages = messages.filter(msg => msg.threadId === threadId);
      }

      if (type) {
        messages = messages.filter(msg => msg.type === type);
      }

      // Simple text search
      const searchRegex = new RegExp(query, 'i');
      const results = messages.filter(msg => 
        searchRegex.test(msg.content)
      ).slice(0, parseInt(limit));

      res.json({
        query,
        results: results.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          author: msg.author,
          timestamp: msg.timestamp,
          threadId: msg.threadId
        })),
        count: results.length
      });

    } catch (error) {
      console.error('Error searching chat:', error);
      res.status(500).json({
        error: 'Failed to search chat',
        message: 'Unable to search chat messages'
      });
    }
  }
);

module.exports = router;