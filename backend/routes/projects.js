const express = require('express');
const Project = require('../models/Project');
const Chat = require('../models/Chat');
const { 
  authenticateJWT, 
  requireProjectAccess, 
  requireOwnership,
  requireRole 
} = require('../middleware/auth');
const { 
  projectValidation, 
  handleValidationErrors,
  paramValidation,
  queryValidation
} = require('../middleware/validation');
const { 
  projectCreation,
  general,
  trackUsage 
} = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get user's projects
router.get('/',
  queryValidation.pagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status = 'active', search } = req.query;
      const skip = (page - 1) * limit;

      let projects;
      
      if (search) {
        projects = await Project.searchProjects(search, req.user._id);
      } else {
        projects = await Project.findUserProjects(req.user._id);
        
        if (status && status !== 'all') {
          projects = projects.filter(p => p.status === status);
        }
      }

      const paginatedProjects = projects.slice(skip, skip + parseInt(limit));

      res.json({
        projects: paginatedProjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: projects.length,
          pages: Math.ceil(projects.length / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        error: 'Failed to fetch projects',
        message: 'Unable to retrieve projects'
      });
    }
  }
);

// Get public projects
router.get('/public',
  queryValidation.pagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (page - 1) * limit;

      let projects;
      
      if (search) {
        projects = await Project.searchProjects(search, null, true);
      } else {
        projects = await Project.findPublicProjects(parseInt(limit), skip);
      }

      res.json({
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching public projects:', error);
      res.status(500).json({
        error: 'Failed to fetch public projects',
        message: 'Unable to retrieve public projects'
      });
    }
  }
);

// Create new project
router.post('/',
  projectCreation,
  trackUsage('project_creation'),
  projectValidation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const projectData = {
        ...req.body,
        owner: req.user._id
      };

      const project = new Project(projectData);
      await project.save();

      // Create default chat for project
      await Chat.createForProject(project._id);

      // Update user project count
      req.user.usage.totalProjects += 1;
      await req.user.save();

      // Populate owner info for response
      await project.populate('owner', 'username email avatar');

      res.status(201).json({
        message: 'Project created successfully',
        project
      });

    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        error: 'Project creation failed',
        message: 'Unable to create project'
      });
    }
  }
);

// Get specific project
router.get('/:id',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const project = req.project;
      
      // Update user activity in project
      await project.updateActivity(req.user._id);

      res.json({
        project,
        userRole: req.userRole
      });

    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        error: 'Failed to fetch project',
        message: 'Unable to retrieve project details'
      });
    }
  }
);

// Update project
router.put('/:id',
  paramValidation.objectId,
  projectValidation.update,
  handleValidationErrors,
  requireProjectAccess('edit'),
  async (req, res) => {
    try {
      const updates = req.body;
      const project = req.project;

      // Only owners can change critical settings
      if ((updates.isPublic !== undefined || updates.status !== undefined) && req.userRole !== 'owner') {
        return res.status(403).json({
          error: 'Owner access required',
          message: 'Only project owners can change visibility and status'
        });
      }

      Object.assign(project, updates);
      await project.save();

      // Notify collaborators via socket
      if (req.io) {
        req.io.emit('project:updated', {
          projectId: project._id,
          updates,
          updatedBy: req.user._id
        });
      }

      res.json({
        message: 'Project updated successfully',
        project
      });

    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        error: 'Project update failed',
        message: 'Unable to update project'
      });
    }
  }
);

// Delete project
router.delete('/:id',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  requireOwnership('project'),
  async (req, res) => {
    try {
      const project = req.project;

      // Soft delete - mark as deleted instead of removing
      project.status = 'deleted';
      await project.save();

      res.json({
        message: 'Project deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        error: 'Project deletion failed',
        message: 'Unable to delete project'
      });
    }
  }
);

// Add collaborator
router.post('/:id/collaborators',
  paramValidation.objectId,
  projectValidation.addCollaborator,
  handleValidationErrors,
  requireProjectAccess('invite'),
  async (req, res) => {
    try {
      const { userId, role = 'viewer' } = req.body;
      const project = req.project;

      // Check if user is already a collaborator
      const existingCollab = project.collaborators.find(
        collab => collab.user.toString() === userId
      );

      if (existingCollab) {
        return res.status(409).json({
          error: 'User already collaborator',
          message: 'User is already a collaborator on this project'
        });
      }

      // Check collaborator limit
      if (project.collaborators.length >= project.settings.collaboration.maxCollaborators) {
        return res.status(400).json({
          error: 'Collaborator limit reached',
          message: `Maximum ${project.settings.collaboration.maxCollaborators} collaborators allowed`
        });
      }

      await project.addCollaborator(userId, role);

      // Populate user info
      await project.populate('collaborators.user', 'username email avatar');

      // Notify new collaborator
      if (req.io) {
        req.io.to(`user:${userId}`).emit('project:invitation', {
          projectId: project._id,
          projectName: project.name,
          invitedBy: req.user.username,
          role
        });
      }

      res.status(201).json({
        message: 'Collaborator added successfully',
        collaborator: project.collaborators[project.collaborators.length - 1]
      });

    } catch (error) {
      console.error('Error adding collaborator:', error);
      res.status(500).json({
        error: 'Failed to add collaborator',
        message: error.message || 'Unable to add collaborator'
      });
    }
  }
);

// Update collaborator role
router.put('/:id/collaborators/:userId',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('invite'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const project = req.project;

      if (!['viewer', 'collaborator'].includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          message: 'Role must be viewer or collaborator'
        });
      }

      await project.updateCollaboratorRole(userId, role);

      // Notify updated user
      if (req.io) {
        req.io.to(`user:${userId}`).emit('project:role_updated', {
          projectId: project._id,
          newRole: role,
          updatedBy: req.user.username
        });
      }

      res.json({
        message: 'Collaborator role updated successfully'
      });

    } catch (error) {
      console.error('Error updating collaborator role:', error);
      res.status(500).json({
        error: 'Failed to update collaborator role',
        message: error.message || 'Unable to update role'
      });
    }
  }
);

// Remove collaborator
router.delete('/:id/collaborators/:userId',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('invite'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const project = req.project;

      await project.removeCollaborator(userId);

      // Notify removed user
      if (req.io) {
        req.io.to(`user:${userId}`).emit('project:removed', {
          projectId: project._id,
          projectName: project.name,
          removedBy: req.user.username
        });
      }

      res.json({
        message: 'Collaborator removed successfully'
      });

    } catch (error) {
      console.error('Error removing collaborator:', error);
      res.status(500).json({
        error: 'Failed to remove collaborator',
        message: 'Unable to remove collaborator'
      });
    }
  }
);

// Get project statistics
router.get('/:id/stats',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const project = req.project;
      const { timeframe = 'week' } = req.query;

      // Get execution stats if code execution service is available
      let executionStats = null;
      try {
        const codeExecutionService = require('../services/codeExecutionService');
        executionStats = await codeExecutionService.getExecutionStats(project._id, timeframe);
      } catch (error) {
        console.log('Code execution stats not available');
      }

      // Get chat stats
      const chat = await Chat.findByProject(project._id);
      const chatStats = chat ? {
        totalMessages: chat.stats.totalMessages,
        totalTokens: chat.stats.totalTokens,
        totalCost: chat.stats.totalCost,
        aiInteractions: chat.stats.aiInteractions
      } : null;

      res.json({
        project: {
          id: project._id,
          name: project.name,
          stats: project.stats
        },
        execution: executionStats,
        chat: chatStats,
        timeframe
      });

    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'Unable to retrieve project statistics'
      });
    }
  }
);

// Archive project
router.put('/:id/archive',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  requireOwnership('project'),
  async (req, res) => {
    try {
      const project = req.project;
      
      project.status = 'archived';
      await project.save();

      res.json({
        message: 'Project archived successfully'
      });

    } catch (error) {
      console.error('Error archiving project:', error);
      res.status(500).json({
        error: 'Failed to archive project',
        message: 'Unable to archive project'
      });
    }
  }
);

// Restore project
router.put('/:id/restore',
  paramValidation.objectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  requireOwnership('project'),
  async (req, res) => {
    try {
      const project = req.project;
      
      project.status = 'active';
      await project.save();

      res.json({
        message: 'Project restored successfully'
      });

    } catch (error) {
      console.error('Error restoring project:', error);
      res.status(500).json({
        error: 'Failed to restore project',
        message: 'Unable to restore project'
      });
    }
  }
);

// Get project activity feed
router.get('/:id/activity',
  paramValidation.objectId,
  queryValidation.pagination,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { limit = 20, skip = 0 } = req.query;
      const projectId = req.params.id;

      // This would typically aggregate activity from multiple sources
      // For now, return basic project info
      const activities = [];

      res.json({
        activities,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });

    } catch (error) {
      console.error('Error fetching project activity:', error);
      res.status(500).json({
        error: 'Failed to fetch activity',
        message: 'Unable to retrieve project activity'
      });
    }
  }
);

module.exports = router;