const express = require('express');
const KnowledgeBase = require('../models/KnowledgeBase');
const Project = require('../models/Project');
const { 
  authenticateJWT, 
  requireProjectAccess 
} = require('../middleware/auth');
const { 
  knowledgeValidation, 
  handleValidationErrors,
  paramValidation,
  queryValidation
} = require('../middleware/validation');
const { 
  knowledge,
  trackUsage 
} = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get knowledge items by project
router.get('/project/:projectId',
  paramValidation.projectId,
  queryValidation.search,
  queryValidation.pagination,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { 
        type, 
        category, 
        status = 'published', 
        tags, 
        q: search,
        limit = 20,
        skip = 0
      } = req.query;

      let knowledgeItems;

      if (search) {
        // Search with filters
        const searchOptions = {
          type,
          category,
          tags: tags ? tags.split(',') : [],
          limit: parseInt(limit),
          skip: parseInt(skip)
        };
        
        knowledgeItems = await KnowledgeBase.searchKnowledge(projectId, search, searchOptions);
      } else {
        // Filter without search
        const filters = { status };
        if (type) filters.type = type;
        if (category) filters.category = category;
        if (tags) filters.tags = { $in: tags.split(',') };

        knowledgeItems = await KnowledgeBase.findByProject(projectId, filters);
        knowledgeItems = knowledgeItems.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
      }

      res.json({
        knowledgeItems,
        count: knowledgeItems.length
      });

    } catch (error) {
      console.error('Error fetching knowledge items:', error);
      res.status(500).json({
        error: 'Failed to fetch knowledge items',
        message: 'Unable to retrieve knowledge base'
      });
    }
  }
);

// Get knowledge items by category
router.get('/project/:projectId/categories',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const categories = await KnowledgeBase.getByCategory(projectId);

      res.json({
        categories
      });

    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        error: 'Failed to fetch categories',
        message: 'Unable to retrieve knowledge categories'
      });
    }
  }
);

// Get top tags
router.get('/project/:projectId/tags',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 20 } = req.query;

      const tags = await KnowledgeBase.getTopTags(projectId, parseInt(limit));

      res.json({
        tags
      });

    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({
        error: 'Failed to fetch tags',
        message: 'Unable to retrieve knowledge tags'
      });
    }
  }
);

// Create knowledge item
router.post('/',
  knowledge,
  trackUsage('knowledge_operation'),
  knowledgeValidation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.body;

      // Check project access
      const project = await Project.findById(projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to create knowledge items in this project'
        });
      }

      const knowledgeItem = new KnowledgeBase({
        ...req.body,
        createdBy: req.user._id
      });

      await knowledgeItem.save();

      // Update project stats
      await Project.findByIdAndUpdate(projectId, {
        $inc: { 'stats.totalKnowledgeItems': 1 },
        $set: { 'stats.lastActivity': new Date() }
      });

      // Populate creator info
      await knowledgeItem.populate('createdBy', 'username avatar');

      res.status(201).json({
        message: 'Knowledge item created successfully',
        knowledgeItem
      });

    } catch (error) {
      console.error('Error creating knowledge item:', error);
      res.status(500).json({
        error: 'Knowledge creation failed',
        message: 'Unable to create knowledge item'
      });
    }
  }
);

// Get specific knowledge item
router.get('/:id',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const knowledgeItem = await KnowledgeBase.findById(req.params.id)
        .populate('createdBy', 'username avatar')
        .populate('lastModifiedBy', 'username avatar');

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'view')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view this knowledge item'
        });
      }

      // Increment view count
      await knowledgeItem.incrementView();

      res.json({
        knowledgeItem
      });

    } catch (error) {
      console.error('Error fetching knowledge item:', error);
      res.status(500).json({
        error: 'Failed to fetch knowledge item',
        message: 'Unable to retrieve knowledge item'
      });
    }
  }
);

// Update knowledge item
router.put('/:id',
  paramValidation.objectId,
  knowledgeValidation.update,
  handleValidationErrors,
  async (req, res) => {
    try {
      const knowledgeItem = await KnowledgeBase.findById(req.params.id);

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to edit this knowledge item'
        });
      }

      // Update knowledge item
      Object.assign(knowledgeItem, req.body);
      knowledgeItem.lastModifiedBy = req.user._id;
      
      await knowledgeItem.save();

      // Populate user info
      await knowledgeItem.populate('lastModifiedBy', 'username avatar');

      res.json({
        message: 'Knowledge item updated successfully',
        knowledgeItem
      });

    } catch (error) {
      console.error('Error updating knowledge item:', error);
      res.status(500).json({
        error: 'Knowledge update failed',
        message: 'Unable to update knowledge item'
      });
    }
  }
);

// Delete knowledge item
router.delete('/:id',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const knowledgeItem = await KnowledgeBase.findById(req.params.id);

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'delete')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to delete this knowledge item'
        });
      }

      await KnowledgeBase.findByIdAndDelete(knowledgeItem._id);

      // Update project stats
      await Project.findByIdAndUpdate(knowledgeItem.projectId, {
        $inc: { 'stats.totalKnowledgeItems': -1 },
        $set: { 'stats.lastActivity': new Date() }
      });

      res.json({
        message: 'Knowledge item deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      res.status(500).json({
        error: 'Knowledge deletion failed',
        message: 'Unable to delete knowledge item'
      });
    }
  }
);

// Clone knowledge item
router.post('/:id/clone',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title } = req.body;
      const knowledgeItem = await KnowledgeBase.findById(req.params.id);

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to clone this knowledge item'
        });
      }

      const clonedItem = await knowledgeItem.clone(title, req.user._id);

      // Populate creator info
      await clonedItem.populate('createdBy', 'username avatar');

      res.status(201).json({
        message: 'Knowledge item cloned successfully',
        knowledgeItem: clonedItem
      });

    } catch (error) {
      console.error('Error cloning knowledge item:', error);
      res.status(500).json({
        error: 'Knowledge cloning failed',
        message: 'Unable to clone knowledge item'
      });
    }
  }
);

// Add reference to knowledge item
router.post('/:id/references',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, id: refId, title, description } = req.body;
      
      if (!['file', 'knowledge', 'url', 'message'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid reference type',
          message: 'Reference type must be file, knowledge, url, or message'
        });
      }

      const knowledgeItem = await KnowledgeBase.findById(req.params.id);

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to edit this knowledge item'
        });
      }

      await knowledgeItem.addReference(type, refId, title, description);

      res.json({
        message: 'Reference added successfully'
      });

    } catch (error) {
      console.error('Error adding reference:', error);
      res.status(500).json({
        error: 'Failed to add reference',
        message: 'Unable to add reference to knowledge item'
      });
    }
  }
);

// Remove reference from knowledge item
router.delete('/:id/references/:type/:refId',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, refId } = req.params;
      const knowledgeItem = await KnowledgeBase.findById(req.params.id);

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to edit this knowledge item'
        });
      }

      await knowledgeItem.removeReference(type, refId);

      res.json({
        message: 'Reference removed successfully'
      });

    } catch (error) {
      console.error('Error removing reference:', error);
      res.status(500).json({
        error: 'Failed to remove reference',
        message: 'Unable to remove reference from knowledge item'
      });
    }
  }
);

// Get similar knowledge items
router.get('/:id/similar',
  paramValidation.objectId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { limit = 5 } = req.query;
      const knowledgeItem = await KnowledgeBase.findById(req.params.id);

      if (!knowledgeItem) {
        return res.status(404).json({
          error: 'Knowledge item not found',
          message: 'The requested knowledge item does not exist'
        });
      }

      // Check project access
      const project = await Project.findById(knowledgeItem.projectId);
      if (!project || !project.canUserAccess(req.user._id, 'view')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view this knowledge item'
        });
      }

      const similarItems = await knowledgeItem.getSimilarItems(parseInt(limit));

      res.json({
        similarItems
      });

    } catch (error) {
      console.error('Error fetching similar items:', error);
      res.status(500).json({
        error: 'Failed to fetch similar items',
        message: 'Unable to retrieve similar knowledge items'
      });
    }
  }
);

// Get recent activity
router.get('/project/:projectId/activity',
  paramValidation.projectId,
  queryValidation.pagination,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 10 } = req.query;

      const recentActivity = await KnowledgeBase.getRecentActivity(projectId, parseInt(limit));

      res.json({
        activity: recentActivity
      });

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        error: 'Failed to fetch activity',
        message: 'Unable to retrieve recent knowledge activity'
      });
    }
  }
);

// Bulk operations
router.post('/bulk',
  handleValidationErrors,
  async (req, res) => {
    try {
      const { operation, itemIds, projectId, data } = req.body;

      if (!['delete', 'archive', 'publish', 'update_category'].includes(operation)) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'Operation must be delete, archive, publish, or update_category'
        });
      }

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          error: 'Invalid item IDs',
          message: 'Item IDs must be a non-empty array'
        });
      }

      // Check project access
      const project = await Project.findById(projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to perform bulk operations in this project'
        });
      }

      let updateQuery = {};
      let message = '';

      switch (operation) {
        case 'delete':
          await KnowledgeBase.deleteMany({ 
            _id: { $in: itemIds }, 
            projectId 
          });
          message = `${itemIds.length} knowledge items deleted successfully`;
          break;

        case 'archive':
          updateQuery = { status: 'archived' };
          message = `${itemIds.length} knowledge items archived successfully`;
          break;

        case 'publish':
          updateQuery = { status: 'published' };
          message = `${itemIds.length} knowledge items published successfully`;
          break;

        case 'update_category':
          if (!data?.category) {
            return res.status(400).json({
              error: 'Category required',
              message: 'Category is required for update_category operation'
            });
          }
          updateQuery = { category: data.category };
          message = `${itemIds.length} knowledge items updated successfully`;
          break;
      }

      if (Object.keys(updateQuery).length > 0) {
        await KnowledgeBase.updateMany(
          { _id: { $in: itemIds }, projectId },
          { $set: updateQuery }
        );
      }

      res.json({
        message,
        operation,
        affectedItems: itemIds.length
      });

    } catch (error) {
      console.error('Error performing bulk operation:', error);
      res.status(500).json({
        error: 'Bulk operation failed',
        message: 'Unable to perform bulk operation'
      });
    }
  }
);

module.exports = router;