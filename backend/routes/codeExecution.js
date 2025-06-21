const express = require('express');
const codeExecutionService = require('../services/codeExecutionService');
const ExecutionResult = require('../models/ExecutionResult');
const Project = require('../models/Project');
const File = require('../models/File');
const { 
  authenticateJWT, 
  requireProjectAccess 
} = require('../middleware/auth');
const { 
  codeExecutionValidation, 
  handleValidationErrors,
  paramValidation,
  queryValidation
} = require('../middleware/validation');
const { 
  codeExecution,
  trackUsage,
  checkDailyQuota
} = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Health check for code execution service
router.get('/health', async (req, res) => {
  try {
    const health = await codeExecutionService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Code execution service health check failed'
    });
  }
});

// Get supported languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await codeExecutionService.getSupportedLanguages();
    res.json({
      languages
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      error: 'Failed to fetch languages',
      message: 'Unable to retrieve supported languages'
    });
  }
});

// Execute code
router.post('/execute',
  codeExecution,
  checkDailyQuota('execution'),
  trackUsage('execution'),
  codeExecutionValidation.execute,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        code, 
        languageId, 
        stdin = '', 
        projectId, 
        fileId,
        timeout = 30,
        memoryLimit = 128
      } = req.body;

      // Check project access if projectId provided
      if (projectId) {
        const project = await Project.findById(projectId);
        if (!project || !project.canUserAccess(req.user._id, 'execute')) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to execute code in this project'
          });
        }
      }

      // Get language name from supported languages
      const languages = await codeExecutionService.getSupportedLanguages();
      const language = languages.find(lang => lang.id === languageId);
      
      if (!language) {
        return res.status(400).json({
          error: 'Unsupported language',
          message: 'The specified language ID is not supported'
        });
      }

      // Validate code
      const validation = codeExecutionService.validateCode(code, language.name);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Code validation failed',
          message: 'Code contains invalid or dangerous patterns',
          errors: validation.errors
        });
      }

      // Execute code
      const executionResult = await codeExecutionService.executeCode({
        code,
        language: language.name,
        stdin,
        userId: req.user._id,
        projectId,
        fileId,
        timeout,
        memoryLimit
      });

      // Update project stats if projectId provided
      if (projectId) {
        await Project.findByIdAndUpdate(projectId, {
          $inc: { 'stats.totalExecutions': 1 },
          $set: { 'stats.lastActivity': new Date() }
        });
      }

      // Update file stats if fileId provided
      if (fileId) {
        await File.findByIdAndUpdate(fileId, {
          $inc: { 'stats.totalExecutions': 1 },
          $set: { 'stats.lastExecution': new Date() }
        });
      }

      // Notify project members if execution is shared
      if (req.io && projectId && executionResult.isShared) {
        req.io.to(`project:${projectId}`).emit('code:execution_completed', {
          projectId,
          fileId,
          userId: req.user._id,
          username: req.user.username,
          result: {
            id: executionResult._id,
            status: executionResult.status,
            language: executionResult.language,
            time: executionResult.time,
            memory: executionResult.memory,
            isSuccess: executionResult.isSuccess
          }
        });
      }

      res.status(201).json({
        message: 'Code executed successfully',
        execution: executionResult
      });

    } catch (error) {
      console.error('Error executing code:', error);
      
      let statusCode = 500;
      let errorMessage = 'Code execution failed';
      
      if (error.message.includes('Unsupported language')) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'Execution rate limit exceeded';
      } else if (error.message.includes('not configured')) {
        statusCode = 503;
        errorMessage = 'Code execution service is not available';
      }

      res.status(statusCode).json({
        error: 'Execution failed',
        message: errorMessage
      });
    }
  }
);

// Get execution result by ID
router.get('/execution/:id',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const executionResult = await codeExecutionService.getExecutionById(req.params.id);
      
      if (!executionResult) {
        return res.status(404).json({
          error: 'Execution not found',
          message: 'The requested execution result does not exist'
        });
      }

      // Check if user can view this execution
      if (executionResult.userId.toString() !== req.user._id.toString()) {
        // Check if user has project access and execution is shared
        const project = await Project.findById(executionResult.projectId);
        if (!project || !project.canUserAccess(req.user._id, 'view') || !executionResult.isShared) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to view this execution result'
          });
        }
      }

      // Increment view count
      await executionResult.incrementView();

      res.json({
        execution: executionResult
      });

    } catch (error) {
      console.error('Error fetching execution result:', error);
      res.status(500).json({
        error: 'Failed to fetch execution result',
        message: 'Unable to retrieve execution result'
      });
    }
  }
);

// Get executions by project
router.get('/project/:projectId',
  paramValidation.projectId,
  queryValidation.pagination,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { 
        limit = 20, 
        skip = 0, 
        status, 
        language, 
        userId 
      } = req.query;

      const options = {
        limit: parseInt(limit),
        skip: parseInt(skip),
        status: status ? parseInt(status) : null,
        language,
        userId
      };

      const executions = await codeExecutionService.getExecutionsByProject(projectId, options);

      res.json({
        executions,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });

    } catch (error) {
      console.error('Error fetching project executions:', error);
      res.status(500).json({
        error: 'Failed to fetch executions',
        message: 'Unable to retrieve project executions'
      });
    }
  }
);

// Get user's executions
router.get('/user/executions',
  queryValidation.pagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const executions = await codeExecutionService.getExecutionsByUser(req.user._id, parseInt(limit));

      res.json({
        executions
      });

    } catch (error) {
      console.error('Error fetching user executions:', error);
      res.status(500).json({
        error: 'Failed to fetch executions',
        message: 'Unable to retrieve your executions'
      });
    }
  }
);

// Get execution statistics
router.get('/project/:projectId/stats',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { timeframe = 'week' } = req.query;

      const stats = await codeExecutionService.getExecutionStats(projectId, timeframe);
      const languageStats = await codeExecutionService.getLanguageStats(projectId, timeframe);

      res.json({
        stats,
        languageStats,
        timeframe
      });

    } catch (error) {
      console.error('Error fetching execution stats:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'Unable to retrieve execution statistics'
      });
    }
  }
);

// Delete execution result
router.delete('/execution/:id',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const deleted = await codeExecutionService.deleteExecution(req.params.id, req.user._id);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Execution not found',
          message: 'The requested execution result does not exist or you do not have permission to delete it'
        });
      }

      res.json({
        message: 'Execution result deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting execution result:', error);
      res.status(400).json({
        error: 'Failed to delete execution result',
        message: error.message || 'Unable to delete execution result'
      });
    }
  }
);

// Update execution notes
router.put('/execution/:id/notes',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { notes } = req.body;
      
      if (notes && notes.length > 1000) {
        return res.status(400).json({
          error: 'Notes too long',
          message: 'Notes cannot exceed 1000 characters'
        });
      }

      const executionResult = await ExecutionResult.findById(req.params.id);
      
      if (!executionResult) {
        return res.status(404).json({
          error: 'Execution not found',
          message: 'The requested execution result does not exist'
        });
      }

      // Only owner can update notes
      if (executionResult.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only the execution owner can update notes'
        });
      }

      executionResult.notes = notes || '';
      await executionResult.save();

      res.json({
        message: 'Notes updated successfully'
      });

    } catch (error) {
      console.error('Error updating execution notes:', error);
      res.status(500).json({
        error: 'Failed to update notes',
        message: 'Unable to update execution notes'
      });
    }
  }
);

// Toggle execution sharing
router.put('/execution/:id/sharing',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { isShared } = req.body;
      
      if (typeof isShared !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid sharing value',
          message: 'isShared must be a boolean value'
        });
      }

      const executionResult = await ExecutionResult.findById(req.params.id);
      
      if (!executionResult) {
        return res.status(404).json({
          error: 'Execution not found',
          message: 'The requested execution result does not exist'
        });
      }

      // Only owner can update sharing
      if (executionResult.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only the execution owner can update sharing settings'
        });
      }

      executionResult.isShared = isShared;
      await executionResult.save();

      res.json({
        message: `Execution ${isShared ? 'shared' : 'made private'} successfully`
      });

    } catch (error) {
      console.error('Error updating execution sharing:', error);
      res.status(500).json({
        error: 'Failed to update sharing',
        message: 'Unable to update execution sharing'
      });
    }
  }
);

// Get recent executions
router.get('/project/:projectId/recent',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 10 } = req.query;

      const executions = await ExecutionResult.getRecentExecutions(projectId, parseInt(limit));

      res.json({
        executions
      });

    } catch (error) {
      console.error('Error fetching recent executions:', error);
      res.status(500).json({
        error: 'Failed to fetch recent executions',
        message: 'Unable to retrieve recent executions'
      });
    }
  }
);

// Check execution status (for polling)
router.get('/execution/:id/status',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const executionResult = await ExecutionResult.findById(req.params.id);
      
      if (!executionResult) {
        return res.status(404).json({
          error: 'Execution not found',
          message: 'The requested execution result does not exist'
        });
      }

      // Check if user can view this execution
      if (executionResult.userId.toString() !== req.user._id.toString()) {
        const project = await Project.findById(executionResult.projectId);
        if (!project || !project.canUserAccess(req.user._id, 'view') || !executionResult.isShared) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to view this execution result'
          });
        }
      }

      res.json({
        status: executionResult.status,
        isCompleted: executionResult.status.id > 2,
        completedAt: executionResult.completedAt,
        isSuccess: executionResult.isSuccess
      });

    } catch (error) {
      console.error('Error checking execution status:', error);
      res.status(500).json({
        error: 'Failed to check status',
        message: 'Unable to check execution status'
      });
    }
  }
);

// Admin route to cleanup old executions (if user is project owner)
router.delete('/cleanup/:projectId',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { olderThanDays = 30 } = req.query;

      // Only project owners can cleanup
      const project = await Project.findById(projectId);
      if (project.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Owner access required',
          message: 'Only project owners can cleanup executions'
        });
      }

      const deletedCount = await codeExecutionService.cleanupOldExecutions(parseInt(olderThanDays));

      res.json({
        message: 'Cleanup completed successfully',
        deletedCount
      });

    } catch (error) {
      console.error('Error cleaning up executions:', error);
      res.status(500).json({
        error: 'Cleanup failed',
        message: 'Unable to cleanup old executions'
      });
    }
  }
);

module.exports = router;