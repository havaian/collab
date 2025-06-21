const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Project = require('../models/Project');
const { requireAuth, requireProjectAccess, requireAPIKey } = require('../middleware/auth');
const { chatValidation } = require('../middleware/validation');
const { handleValidationErrors } = require('../middleware/errorHandler');
const aiService = require('../services/aiService');

// Get chat messages for a project
router.get('/:projectId', 
  requireAuth, 
  requireProjectAccess(),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 50, offset = 0, threadId } = req.query;

      let chat = await Chat.findOne({ projectId })
        .populate('messages.author', 'username avatar')
        .sort({ 'messages.createdAt': -1 });

      if (!chat) {
        // Create new chat if it doesn't exist
        chat = new Chat({
          projectId,
          messages: []
        });
        await chat.save();
      }

      // Filter messages by thread if specified
      let messages = chat.messages;
      if (threadId) {
        messages = messages.filter(msg => msg.threadId === threadId);
      }

      // Apply pagination
      const paginatedMessages = messages
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
        .reverse(); // Show oldest first

      res.json({
        messages: paginatedMessages,
        total: messages.length,
        hasMore: parseInt(offset) + parseInt(limit) < messages.length
      });

    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to fetch chat messages'
      });
    }
  }
);

// Send message to AI and get response
router.post('/:projectId',
  requireAuth,
  requireProjectAccess('collaborate'),
  requireAPIKey('openai'),
  chatValidation.sendMessage,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const {
        message: content,
        threadId,
        includeContext = true,
        model,
        temperature,
        maxTokens
      } = req.body;

      // Find or create chat
      let chat = await Chat.findOne({ projectId });
      if (!chat) {
        chat = new Chat({
          projectId,
          messages: [],
          settings: {
            aiModel: model || 'gpt-3.5-turbo',
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 2000
          }
        });
      }

      // Get recent messages for context
      const recentMessages = chat.messages
        .filter(msg => !threadId || msg.threadId === threadId)
        .slice(-10)
        .map(msg => ({
          type: msg.type,
          content: msg.content
        }));

      // Add user message to chat
      const userMessage = {
        type: 'user',
        content,
        author: req.user._id,
        createdAt: new Date(),
        threadId: threadId || null
      };

      chat.messages.push(userMessage);

      try {
        // Get AI response
        console.log(`Processing AI request for project ${projectId} from user ${req.user.username}`);
        
        const aiResponse = await aiService.sendMessage({
          message: content,
          apiKey: req.apiKey,
          model: model || chat.settings.aiModel,
          temperature: temperature || chat.settings.temperature,
          maxTokens: maxTokens || chat.settings.maxTokens,
          projectId,
          userId: req.user._id,
          includeContext,
          previousMessages: recentMessages
        });

        // Add AI response to chat
        const assistantMessage = {
          type: 'assistant',
          content: aiResponse.message,
          model: aiResponse.model,
          tokens: {
            prompt: aiResponse.usage.promptTokens,
            completion: aiResponse.usage.completionTokens,
            total: aiResponse.usage.totalTokens
          },
          cost: aiResponse.cost,
          context: aiResponse.context,
          createdAt: new Date(),
          threadId: threadId || null
        };

        chat.messages.push(assistantMessage);

        // Update chat statistics
        if (!chat.stats) {
          chat.stats = {
            totalMessages: 0,
            totalTokens: 0,
            totalCost: 0
          };
        }

        chat.stats.totalMessages += 2; // User + AI message
        chat.stats.totalTokens += aiResponse.usage.totalTokens;
        chat.stats.totalCost += aiResponse.cost;
        chat.updatedAt = new Date();

        await chat.save();

        // Emit to other project members via Socket.IO
        if (req.io) {
          req.io.to(`project:${projectId}`).emit('chat:new_messages', {
            projectId,
            messages: [userMessage, assistantMessage],
            threadId
          });
        }

        // Log successful interaction
        console.log(`AI response generated successfully. Tokens: ${aiResponse.usage.totalTokens}, Cost: $${aiResponse.cost.toFixed(6)}`);

        res.json({
          userMessage,
          assistantMessage,
          usage: aiResponse.usage,
          cost: aiResponse.cost,
          context: aiResponse.context,
          totalCost: chat.stats.totalCost
        });

      } catch (aiError) {
        console.error('AI Service Error:', aiError);
        
        // Add error message to chat
        const errorMessage = {
          type: 'system',
          content: `AI Error: ${aiError.message}`,
          createdAt: new Date(),
          threadId: threadId || null,
          isError: true
        };

        chat.messages.push(errorMessage);
        await chat.save();

        // Emit error to other project members
        if (req.io) {
          req.io.to(`project:${projectId}`).emit('chat:error', {
            projectId,
            error: aiError.message,
            threadId
          });
        }

        // Return appropriate error status
        let statusCode = 500;
        if (aiError.message.includes('Invalid API key')) {
          statusCode = 401;
        } else if (aiError.message.includes('rate limit')) {
          statusCode = 429;
        } else if (aiError.message.includes('Invalid request')) {
          statusCode = 400;
        }

        res.status(statusCode).json({
          error: 'AI service error',
          message: aiError.message,
          userMessage // Still return the user message that was saved
        });
      }

    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to process chat message'
      });
    }
  }
);

// Clear chat history
router.delete('/:projectId',
  requireAuth,
  requireProjectAccess('manage'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { threadId } = req.query;

      const chat = await Chat.findOne({ projectId });
      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found',
          message: 'No chat history found for this project'
        });
      }

      if (threadId) {
        // Clear specific thread
        chat.messages = chat.messages.filter(msg => msg.threadId !== threadId);
      } else {
        // Clear all messages
        chat.messages = [];
        chat.stats = {
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0
        };
      }

      chat.updatedAt = new Date();
      await chat.save();

      // Emit to other project members
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('chat:cleared', {
          projectId,
          threadId: threadId || null,
          clearedBy: req.user.username
        });
      }

      res.json({
        message: threadId ? 'Thread cleared successfully' : 'Chat history cleared successfully',
        remainingMessages: chat.messages.length
      });

    } catch (error) {
      console.error('Error clearing chat:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to clear chat history'
      });
    }
  }
);

// Get chat statistics
router.get('/:projectId/stats',
  requireAuth,
  requireProjectAccess(),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const chat = await Chat.findOne({ projectId });
      if (!chat) {
        return res.json({
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0,
          messagesThisMonth: 0,
          tokensThisMonth: 0,
          costThisMonth: 0
        });
      }

      // Calculate monthly stats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const monthlyMessages = chat.messages.filter(msg => 
        msg.createdAt >= thisMonth && msg.type === 'assistant'
      );

      const monthlyTokens = monthlyMessages.reduce((sum, msg) => 
        sum + (msg.tokens?.total || 0), 0
      );

      const monthlyCost = monthlyMessages.reduce((sum, msg) => 
        sum + (msg.cost || 0), 0
      );

      res.json({
        totalMessages: chat.stats?.totalMessages || chat.messages.length,
        totalTokens: chat.stats?.totalTokens || 0,
        totalCost: chat.stats?.totalCost || 0,
        messagesThisMonth: monthlyMessages.length,
        tokensThisMonth: monthlyTokens,
        costThisMonth: monthlyCost,
        lastActivity: chat.updatedAt
      });

    } catch (error) {
      console.error('Error fetching chat stats:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to fetch chat statistics'
      });
    }
  }
);

// Update chat settings
router.put('/:projectId/settings',
  requireAuth,
  requireProjectAccess('manage'),
  chatValidation.updateSettings,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { aiModel, temperature, maxTokens } = req.body;

      let chat = await Chat.findOne({ projectId });
      if (!chat) {
        chat = new Chat({
          projectId,
          messages: [],
          settings: {}
        });
      }

      // Update settings
      if (aiModel) chat.settings.aiModel = aiModel;
      if (temperature !== undefined) chat.settings.temperature = temperature;
      if (maxTokens) chat.settings.maxTokens = maxTokens;

      chat.updatedAt = new Date();
      await chat.save();

      res.json({
        message: 'Chat settings updated successfully',
        settings: chat.settings
      });

    } catch (error) {
      console.error('Error updating chat settings:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to update chat settings'
      });
    }
  }
);

// Test AI connection
router.post('/:projectId/test',
  requireAuth,
  requireProjectAccess(),
  requireAPIKey('openai'),
  async (req, res) => {
    try {
      const testResponse = await aiService.sendMessage({
        message: 'Hello! Please respond with a brief confirmation that the AI integration is working.',
        apiKey: req.apiKey,
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 50,
        projectId: req.params.projectId,
        userId: req.user._id,
        includeContext: false,
        previousMessages: []
      });

      res.json({
        success: true,
        message: 'AI integration test successful',
        response: testResponse.message,
        model: testResponse.model,
        usage: testResponse.usage,
        cost: testResponse.cost
      });

    } catch (error) {
      console.error('AI test error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        message: 'AI integration test failed'
      });
    }
  }
);

module.exports = router;